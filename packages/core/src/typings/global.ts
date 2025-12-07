import type { LibraryPrefix } from "../bootstrapping/typings/library-components";
import type { CustomElementTagNames } from "../bootstrapping/typings/non-standard-elements";
import type {
  LibraryLoaderOptions,
  RegisteredLibraries
} from "../bootstrapping/typings/types";

declare global {
  // TODO: Add support to this
  var kasstorCoreVersions: string[] | undefined;

  var kasstorCoreCustomElementLoaders:
    | {
        /**
         * Set of custom elements that have been lazy loaded.
         * This is used to avoid loading the same element multiple times.
         */
        readonly lazyLoadedCustomElements: Set<CustomElementTagNames>;

        /**
         * Mapping between the library's prefix and the options to define
         * the custom elements of that library.
         */
        readonly registeredLibraries: RegisteredLibraries<LibraryPrefix>;

        /**
         * Map between custom element tag names and their loader functions.
         * This is used to register the custom elements that are not defined yet.
         */
        readonly registeredLoaders: Map<
          CustomElementTagNames,
          {
            readonly elementInfo: Required<
              LibraryLoaderOptions<LibraryPrefix>["customElements"][CustomElementTagNames]
            >;
            readonly libraryName: string;
          }
        >;

        /**
         * MutationObserver that is used to observe mutations in the DOM.
         * It is used to discover new custom elements that are not defined
         * yet, and to register them.
         */
        readonly watcher: MutationObserver;
      }
    | undefined;
}

// Necessary to auto-detect this module in the project
export type {};
