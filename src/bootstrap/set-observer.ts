export const setObserverIfNotDefined = (
  discover: (root: Element | ShadowRoot) => Promise<void>
) => {
  // We use the window to initialize these variables, since multiple libraries
  // can use this utility but we don't want to set multiple MutationObservers
  // for the same task
  globalThis.litDevKit ??= {
    defineCustomElementsWatcher: new MutationObserver(mutations => {
      for (let index = 0; index < mutations.length; index++) {
        const mutation = mutations[index];

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            discover(node as Element);
          }
        }
      }
    }),

    lazyLoadedElements: new Set()
  };
};

