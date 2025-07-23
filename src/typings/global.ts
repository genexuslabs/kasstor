declare global {
  // eslint-disable-next-line no-var
  var litDevKit:
    | {
        defineCustomElementsWatcher: MutationObserver;
        lazyLoadedElements: Set<keyof HTMLElementTagNameMap>;
      }
    | undefined;
}

// Necessary to auto-detect this module in the project
export {};

