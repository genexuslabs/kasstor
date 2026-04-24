import { removeIndex } from "../array/index.js";

// ---------------------------------------------------------------------------
// Per-node stylesheet adoption with shared reference counting.
//
// Two public entry points share the same underlying ref count:
//
//  - addStyleSheet / removeStyleSheet — explicit target node. Each call is one
//    reference; the caller is responsible for matching them.
//
//  - addGlobalStyleSheet / removeGlobalStyleSheet — element-based. The root
//    that contains the element is resolved automatically, and an idempotent
//    guard ensures each (element, sheet) pair contributes exactly one
//    reference (so a `connectedCallback` firing twice is harmless).
//
// All bookkeeping uses WeakMap / WeakSet, so entries are reclaimed when their
// keys (elements, roots, stylesheets) are garbage collected.
// ---------------------------------------------------------------------------

/**
 * Per-node, per-sheet reference count. The sheet is pushed into
 * `node.adoptedStyleSheets` on the 0 → 1 transition and removed on the
 * 1 → 0 transition, regardless of which public API caused it.
 */
const sheetReferences = new WeakMap<
  Document | ShadowRoot,
  WeakMap<CSSStyleSheet, number>
>();

/**
 * Adopts `stylesheet` directly into `node` (a `Document` or `ShadowRoot`).
 *
 * Each call increments a per-node reference count for the stylesheet. The
 * sheet is physically inserted into `node.adoptedStyleSheets` only on the
 * first reference; subsequent calls are cheap counter bumps. It stays adopted
 * until every reference is released via {@link removeStyleSheet} (or via
 * {@link removeGlobalStyleSheet} for references taken through the global API).
 *
 * Safe to mix with {@link addGlobalStyleSheet} on the same `(node, stylesheet)`
 * pair: both APIs share the same counter, so the sheet is never duplicated.
 *
 * @param node - The root the stylesheet should apply to.
 * @param stylesheet - The stylesheet to adopt.
 */
export const addStyleSheet = (node: Document | ShadowRoot, stylesheet: CSSStyleSheet) => {
  let byNode = sheetReferences.get(node);
  if (!byNode) {
    byNode = new WeakMap();
    sheetReferences.set(node, byNode);
  }

  const count = byNode.get(stylesheet) ?? 0;

  // First reference for this (node, stylesheet): physically adopt the sheet
  if (count === 0) {
    node.adoptedStyleSheets.push(stylesheet);
  }

  byNode.set(stylesheet, count + 1);
};

/**
 * Releases one reference to `stylesheet` on `node`. The sheet is removed from
 * `node.adoptedStyleSheets` only when the last reference is released.
 *
 * Calls for a `(node, stylesheet)` pair with no outstanding references are a
 * no-op, so it is safe to call defensively.
 *
 * @param node - The root the reference was taken on.
 * @param stylesheet - The stylesheet to release.
 */
export const removeStyleSheet = (node: Document | ShadowRoot, stylesheet: CSSStyleSheet) => {
  const byNode = sheetReferences.get(node);
  if (!byNode) {
    return;
  }

  const count = byNode.get(stylesheet);
  if (count === undefined) {
    return;
  }

  // Last reference: physically remove the sheet
  if (count === 1) {
    const styleSheetIndex = node.adoptedStyleSheets.indexOf(stylesheet);

    if (styleSheetIndex !== -1) {
      removeIndex(node.adoptedStyleSheets, styleSheetIndex);
    }

    byNode.delete(stylesheet);
  } else {
    byNode.set(stylesheet, count - 1);
  }
};

/**
 * Snapshot of the root node each element is in at the moment it adopts a
 * stylesheet. Needed because inside `disconnectedCallback`,
 * `element.getRootNode()` no longer returns the original root (it returns the
 * element itself), so we cannot recover it lazily on removal.
 */
const elementRoots = new WeakMap<HTMLElement, Document | ShadowRoot>();

/**
 * Tracks which stylesheets each element has already registered through
 * {@link addGlobalStyleSheet}. Used to make the global API idempotent per
 * `(element, stylesheet)` pair, so a `connectedCallback` firing more than
 * once does not inflate the reference count and leak an extra adoption.
 */
const elementRegisteredSheets = new WeakMap<HTMLElement, WeakSet<CSSStyleSheet>>();

/**
 * Adopts `stylesheet` into the root (`Document` or `ShadowRoot`) that
 * currently contains `element`.
 *
 * Useful when a component does not know in advance whether it is rendered
 * directly in the document or nested inside a `ShadowRoot`: the stylesheet is
 * routed to whichever root the element is in.
 *
 * Idempotent per `(element, stylesheet)`: calling it twice for the same pair
 * (e.g. a `connectedCallback` that runs more than once) only counts as one
 * reference. Pair with {@link removeGlobalStyleSheet} in
 * `disconnectedCallback`.
 *
 * Safe to mix with {@link addStyleSheet}: both share the same per-root
 * reference count, so the sheet is never duplicated and stays adopted while
 * either API still holds a reference.
 *
 * @param element - The element that needs the stylesheet to be applied to its
 *   root.
 * @param stylesheet - The stylesheet to adopt.
 */
export const addGlobalStyleSheet = (element: HTMLElement, stylesheet: CSSStyleSheet) => {
  const rootNode = element.getRootNode();

  // Element is detached: nothing to adopt onto
  if (!(rootNode instanceof Document || rootNode instanceof ShadowRoot)) {
    return;
  }

  // Idempotent guard: skip if this element already holds a reference for this
  // stylesheet
  let registered = elementRegisteredSheets.get(element);
  if (registered?.has(stylesheet)) {
    return;
  }
  if (!registered) {
    registered = new WeakSet();
    elementRegisteredSheets.set(element, registered);
  }
  registered.add(stylesheet);

  // Snapshot the root for later cleanup in disconnectedCallback (see
  // elementRoots docs)
  elementRoots.set(element, rootNode);

  addStyleSheet(rootNode, stylesheet);
};

/**
 * Releases the reference that `element` holds on `stylesheet`.
 *
 * The sheet is only physically removed from the root when no other reference
 * remains — including references taken through {@link addStyleSheet}. Calls
 * for an element/stylesheet pair that was never registered (or already
 * removed) are a no-op.
 *
 * Typically called from `disconnectedCallback`, mirroring a previous call to
 * {@link addGlobalStyleSheet} from `connectedCallback`.
 *
 * @param element - The element that previously requested the stylesheet.
 * @param stylesheet - The stylesheet to release.
 */
export const removeGlobalStyleSheet = (element: HTMLElement, stylesheet: CSSStyleSheet) => {
  const registered = elementRegisteredSheets.get(element);
  if (!registered?.has(stylesheet)) {
    return;
  }
  registered.delete(stylesheet);

  // The root was snapshotted on add. If it is missing here (e.g. add was
  // never called, or the root was GC'd before this call), there is nothing
  // to release.
  const rootNode = elementRoots.get(element);
  if (!rootNode) {
    return;
  }

  removeStyleSheet(rootNode, stylesheet);
};
