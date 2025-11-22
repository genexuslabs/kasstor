import { removeIndex } from "../../other/array.js";

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
const globalStyles = new WeakMap<
  Document | ShadowRoot,
  WeakMap<CSSStyleSheet, number>
>();

export const addGlobalStyleSheet = (
  element: HTMLElement,
  stylesheet: CSSStyleSheet
) => {
  const rootNode = element.getRootNode();

  if (rootNode instanceof ShadowRoot || rootNode instanceof Document) {
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
    const rootNodeStyleSheetReferences =
      rootNodeGlobalStyles.get(stylesheet) ?? 0;

    // Set the StyleSheet references
    if (rootNodeStyleSheetReferences === 0) {
      rootNode.adoptedStyleSheets.push(stylesheet);
    }

    // Increase the StyleSheet references
    rootNodeGlobalStyles.set(stylesheet, rootNodeStyleSheetReferences + 1);
  }
};

export const removeGlobalStyleSheet = (
  element: HTMLElement,
  stylesheet: CSSStyleSheet
) => {
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
    const styleSheetIndex = rootNode.adoptedStyleSheets.findIndex(
      rootNodeStyleSheet => rootNodeStyleSheet === stylesheet
    );

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
