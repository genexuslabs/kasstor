import type { LibraryPrefix } from "../bootstrapping/typings/library-components";
import type { CustomElementTagNames } from "../bootstrapping/typings/non-standard-elements";
import type {
  CustomElementInfo,
  RegisteredLibraries,
  RegisteredLoaderInfo
} from "../bootstrapping/typings/types";

declare global {
  // TODO: Add support to this
  var kasstorCoreVersions: string[] | undefined;

  var kasstorCoreAttachedCustomElementsWithoutLoader:
    | Set<CustomElementTagNames>
    | undefined;

  /**
   * Set of custom elements that have been loaded.
   * This is used to avoid loading the same element multiple times.
   */
  var kasstorCoreLoadedCustomElements: Set<CustomElementTagNames> | undefined;

  // We use the window to initialize these variables, since multiple libraries
  // can use this utility but we don't want to set multiple MutationObservers
  // for the same task
  var kasstorCoreCustomElementLoaders:
    | {
        /**
         * If a custom element is being lazy loaded, its promise will be stored
         * in this map.
         *
         * The main purpose of this Map is to improve the render performance by
         * only having one promise for the same element (even if it is attached
         * multiple times).
         */
        readonly customElementLoaderPromises: Map<
          CustomElementTagNames,
          ReturnType<CustomElementInfo<CustomElementTagNames>["loader"]>
        >;

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
          RegisteredLoaderInfo
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
