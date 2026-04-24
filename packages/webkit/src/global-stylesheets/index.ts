import { removeIndex } from "../array/index.js";

/**
 * We need to store the root node of the element to later remove the stylesheet when
 * the element is disconnected from the DOM. We have to store the root node,
 * because when disconnectedCallback is called the getRootNode method does
 * not return the actual rootNode of the element (it returns a reference to
 * the element itself).
 */
const rootNodes = new WeakMap<HTMLElement, Document | ShadowRoot>();

/**
 * Given a key it returns a WeakMap for the global StyleSheet that the key has.
 * Each StyleSheet contains the number of elements that reference that
 * StyleSheet in the key.
 *
 * The number of reference is particular useful for not removing the StyleSheet
 * in the key (Document | ShadowRoot) until there is no element that needs to
 * reference that StyleSheet.
 */
const globalStyles = new WeakMap<Document | ShadowRoot, WeakMap<CSSStyleSheet, number>>();

/**
 * Tracks which (element, stylesheet) pairs have already been registered via
 * addGlobalStyleSheet. This prevents the reference count from being inflated
 * when add is called multiple times for the same element + stylesheet without
 * a matching remove in between (e.g. connectedCallback firing twice).
 */
const registeredPairs = new WeakMap<HTMLElement, WeakSet<CSSStyleSheet>>();

/**
 * Adopts `stylesheet` globally into the root that contains `element`, so the
 * styles apply to every element under the same root.
 *
 * Useful when a component does not know in advance whether it will be placed
 * in the main document or inside a `ShadowRoot`: the stylesheet is routed to
 * whichever root the element currently lives in.
 *
 * Stylesheets are shared and reference-counted per root. If several elements
 * request the same stylesheet in the same root, it is adopted only once; it
 * stays adopted until the last referrer releases it via
 * {@link removeGlobalStyleSheet}. Pair this call with
 * {@link removeGlobalStyleSheet} in `connectedCallback` /
 * `disconnectedCallback` to get automatic cleanup.
 *
 * @param element - The element that needs the stylesheet to be applied to its
 *   root.
 * @param stylesheet - The stylesheet to adopt. Can be shared across many
 *   elements and roots.
 */
export const addGlobalStyleSheet = (element: HTMLElement, stylesheet: CSSStyleSheet) => {
  const rootNode = element.getRootNode();

  if (rootNode instanceof Document || rootNode instanceof ShadowRoot) {
    // Idempotent guard: skip if this element already registered this stylesheet
    if (registeredPairs.get(element)?.has(stylesheet)) {
      return;
    }

    // Track this (element, stylesheet) pair as registered
    let elementSheets = registeredPairs.get(element);
    if (!elementSheets) {
      elementSheets = new WeakSet();
      registeredPairs.set(element, elementSheets);
    }
    elementSheets.add(stylesheet);

    // Store the root node of the element to later remove the stylesheet when
    // the element is disconnected from the DOM. We have to store the root node,
    // because when disconnectedCallback is called the getRootNode method does
    // not return the actual rootNode of the element (it returns a reference to
    // the element itself).
    rootNodes.set(element, rootNode);

    // Ensure the rootNode has a WeakMap for storing its global StyleSheet
    if (!globalStyles.has(rootNode)) {
      globalStyles.set(rootNode, new WeakMap());
    }

    const rootNodeGlobalStyles = globalStyles.get(rootNode)!;
    const rootNodeStyleSheetReferences = rootNodeGlobalStyles.get(stylesheet) ?? 0;

    // Set the StyleSheet references
    if (rootNodeStyleSheetReferences === 0) {
      rootNode.adoptedStyleSheets.push(stylesheet);
    }

    // Increase the StyleSheet references
    rootNodeGlobalStyles.set(stylesheet, rootNodeStyleSheetReferences + 1);
  }
};

/**
 * Releases the reference that `element` holds on `stylesheet` in its root.
 *
 * Because stylesheets added via {@link addGlobalStyleSheet} are shared and
 * reference-counted, the stylesheet is only actually removed from the root
 * (`Document` or `ShadowRoot`) when the last element that was using it
 * releases it. Other elements still referencing the same stylesheet keep
 * seeing its styles applied.
 *
 * Typically called from `disconnectedCallback`, mirroring a previous call to
 * {@link addGlobalStyleSheet} from `connectedCallback`.
 *
 * @param element - The element that previously requested the stylesheet.
 * @param stylesheet - The stylesheet to release.
 */
export const removeGlobalStyleSheet = (element: HTMLElement, stylesheet: CSSStyleSheet) => {
  // Idempotent guard: skip if this element never registered this stylesheet
  // (or already had it removed)
  const elementSheets = registeredPairs.get(element);
  if (!elementSheets?.has(stylesheet)) {
    return;
  }
  elementSheets.delete(stylesheet);

  const rootNode = rootNodes.get(element);

  // We don't know if this case it's possible. Maybe if the rootNode is
  // disconnected and at the same time the memory is recycled before calling
  // this function.Another case could be the element was disconnected before
  // calling connectedCallback?
  if (!rootNode) {
    return;
  }

  const rootNodeGlobalStyles = globalStyles.get(rootNode);

  // Same reasoning as before for this check
  if (!rootNodeGlobalStyles) {
    return;
  }

  const rootNodeStyleSheetReferences = rootNodeGlobalStyles.get(stylesheet);

  // Nothing to do, the StyleSheet mapping doesn't exists
  if (rootNodeStyleSheetReferences === undefined) {
    return;
  }

  // This is the only element that refers this stylesheet, we must remove it
  const mustRemoveStyleSheet = rootNodeStyleSheetReferences === 1;

  if (mustRemoveStyleSheet) {
    // Try to find the StyleSheet in the rootNode
    const styleSheetIndex = rootNode.adoptedStyleSheets.indexOf(stylesheet);

    if (styleSheetIndex !== -1) {
      removeIndex(rootNode.adoptedStyleSheets, styleSheetIndex);
    }

    // Delete the reference in the WeakMap, so new elements must add again this
    // StyleSheet
    rootNodeGlobalStyles.delete(stylesheet);
  }
  // There are more elements that refers this StyleSheet, we must only decrease
  // the reference count
  else {
    rootNodeGlobalStyles.set(stylesheet, rootNodeStyleSheetReferences - 1);
  }
};

