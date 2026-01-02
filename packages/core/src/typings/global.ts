import type { LibraryPrefix } from "../bootstrapping/typings/library-components";
import type { CustomElementTagNames } from "../bootstrapping/typings/non-standard-elements";
import type {
  CustomElementInfo,
  RegisteredLibraries,
  RegisteredLoaderInfo
} from "../bootstrapping/typings/types";
import type { KasstorElement } from "../decorators/Component/index";

declare global {
  // TODO: Add support to this
  var kasstorCoreVersions: string[] | undefined;

  var kasstorCoreAttachedCustomElementsWithoutLoader:
    | Set<CustomElementTagNames>
    | undefined;

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

  /**
   * Indicates whether the Hot Module Replacement (HMR) feature for components
   * is enabled.
   */
  var kasstorCoreHmrComponent: boolean | undefined;

  /**
   * HMR (Hot Module Replacement) data that tracks the current state of HMR.
   *
   * Only available in dev mode and when serving a library with Vite.
   */
  var kasstorCoreHmrData:
    | {
        proxiesForTagNames: Map<
          string,
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            originalProxy: Function;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            currentProxy: Function;
            originalClass: KasstorElement;
            currentClass: KasstorElement;
          }
        >;

        tagNameForClasses: Map<KasstorElement, string>;
      }
    | undefined;

  /**
   * Indicates whether the insights module for performance in enabled.
   *
   * When enabled, re-renders for components are visually highlighted.
   */
  var kasstorCoreInsightsPerformance: boolean | undefined;

  /**
   * Set of custom element tag names that have been loaded/registered.
   * This is used to avoid loading the same element multiple times.
   */
  var kasstorCoreLoadedCustomElements: Set<CustomElementTagNames> | undefined;

  /**
   * Set of registered instances of KasstorElement components.
   * This is used for managing component instances globally.
   *
   * Only available in dev mode.
   */
  var kasstorCoreRegisteredInstances:
    | Map<string, Set<KasstorElement>>
    | undefined;
}

// Necessary to auto-detect this module in the project
export type {};

