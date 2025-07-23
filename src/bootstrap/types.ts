import type { LibraryComponents } from "../typings/library-components";

export type DefineCustomElementsOptions<Prefix extends string> = {
  libraryPrefix: Prefix;

  customElements: {
    lazyLoadPaths: Record<LibraryComponents<Prefix>, () => Promise<unknown>>;

    /**
     * Include your library's custom element tags that don't need to be observed.
     * You don't need to include other custom elements tags outside of your
     * library, as those are already excluded by each library's author.
     *
     * This property is important to optimize the lazy loading performance of
     * your library, by avoid observing mutations in custom elements that don't
     * use any other custom element.
     *
     * **IMPORTANT!!**: Be careful with custom elements that their render can
     * be customized with properties that provides a function to render
     * arbitrary templates, as you **MUST ALWAYS** observe those custom
     * elements. This is the case for the Chameloen's `ch-chat`, the internal
     * render of messages can be customized with the `renderItem` function, so
     * we can avoid observing that custom element.
     *
     * Example of usage:
     * ```ts
     * {
     *   dependencies: {
     *     "ch-action-menu-render": ["ch-popover"],
     *     "ch-combo-box-render": ["ch-popover"],
     *     "ch-flexible-layout-render": ["ch-layout-splitter", "ch-tab-render"],
     *     "ch-markdown-viewer": ["ch-code"],
     *     "ch-tree-view-render": ["ch-checkbox"],
     *     "ch-tooltip": ["ch-popover"]
     *   }
     * }
     * ```
     */
    dependencies?: {
      [key in LibraryComponents<Prefix>]?: Exclude<
        keyof HTMLElementTagNameMap | (string & {}),
        key
      >[];
    };

    neverWatchDOMChanges?: LibraryComponents<Prefix>[];
  };
};

