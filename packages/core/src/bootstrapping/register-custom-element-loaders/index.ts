import type {
  LibraryComponents,
  LibraryPrefix
} from "../typings/library-components";
import type { CustomElementTagNames } from "../typings/non-standard-elements";
import type {
  CustomElementInfo,
  LibraryLoaderOptions,
  RegisteredLoaderInfo
} from "../typings/types";
import { autoLoadCustomElementsIfNeeded } from "./auto-load-custom-elements-if-needed.js";
import { setMutationObserver } from "./set-mutation-observer.js";

/**
 * Registers custom element loaders for a library so that components can be
 * loaded on demand (e.g. when used with the `lazyLoad` directive) instead of
 * only via direct import.
 *
 * Call this once at application or library startup. Each entry in
 * `options.customElements` maps a custom element tag name to a loader function
 * that returns a Promise (typically a dynamic `import()` of the component
 * module). When that tag is attached to the DOM (e.g. via
 * `<my-panel ${lazyLoad()}></my-panel>`), the loader runs and the element is
 * defined.
 *
 * @param options - Configuration for the library: `libraryName`, `libraryPrefix`,
 *   `defaultCustomElementWatchingBehavior`, and `customElements` (record of tag
 *   name to `CustomElementInfo` with `loader` and optional `dependencies`).
 * @see {@link LibraryLoaderOptions} for the full options shape.
 * @see {@link CustomElementInfo} for each entry's `loader` and `dependencies`.
 *
 * @example
 * ```ts
 * registerCustomElementLoaders({
 *   libraryName: "My Library",
 *   libraryPrefix: "my-",
 *   defaultCustomElementWatchingBehavior: "never-observe",
 *   customElements: {
 *     "my-panel": { loader: () => import("./my-panel.js") }
 *   }
 * });
 * ```
 */
export const registerCustomElementLoaders = <Prefix extends LibraryPrefix>(
  options: LibraryLoaderOptions<Prefix>
) => {
  // Define the global config if not previously set
  globalThis.kasstorCoreCustomElementLoaders ??= {
    customElementLoaderPromises: new Map<
      CustomElementTagNames,
      Promise<unknown>
    >(),
    registeredLibraries: new Map(),
    registeredLoaders: new Map<CustomElementTagNames, RegisteredLoaderInfo>(),
    watcher: setMutationObserver()
  };

  const { registeredLibraries, registeredLoaders } =
    globalThis.kasstorCoreCustomElementLoaders;
  const {
    customElements,
    defaultCustomElementWatchingBehavior,
    libraryName,
    libraryPrefix
  } = options;

  // LibraryPrefix already in use
  if (registeredLibraries.has(libraryPrefix)) {
    console.warn(
      `The library prefix "${libraryPrefix}" is already being used by the "${registeredLibraries.get(libraryPrefix)!.libraryName}" library, so the this call to \`registerCustomElementLoaders\` won't register any of the loaders provided.`
    );
    return;
  }
  const customElementTagNamesToRegister = Object.keys(
    customElements
  ) as LibraryComponents<Prefix>[];

  // Register the library
  registeredLibraries.set(libraryPrefix, options as never); // TODO: Fix this type issue

  const newLoadersForCustomElements: CustomElementTagNames[] = [];

  // Register all new custom element loaders
  for (let index = 0; index < customElementTagNamesToRegister.length; index++) {
    const customElementTagName = customElementTagNamesToRegister[index];

    if (registeredLoaders.has(customElementTagName)) {
      console.warn(
        `The custom element "${customElementTagName}" was already registered by the "${registeredLoaders.get(customElementTagName)!.libraryName}" library, so its loader won't be replaced with the one from "${libraryName}" library.`
      );
    } else {
      newLoadersForCustomElements.push(customElementTagName);

      const elementInfo = customElements[
        customElementTagName
      ] as CustomElementInfo<LibraryComponents<Prefix>>;

      // Modify the original object to set the default dependency behavior.
      // This reduces the memory usage, because the original object reference is
      // not garbage collected as it retained by the "registeredLibraries" Map
      elementInfo.dependencies ??= defaultCustomElementWatchingBehavior;

      registeredLoaders.set(customElementTagName, {
        elementInfo: elementInfo as Required<
          LibraryLoaderOptions<LibraryPrefix>["customElements"][CustomElementTagNames]
        >,
        libraryName
      });
    }
  }

  if (newLoadersForCustomElements.length !== 0) {
    autoLoadCustomElementsIfNeeded(newLoadersForCustomElements);
  }
};
