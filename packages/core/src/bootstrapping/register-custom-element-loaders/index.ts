import type {
  LibraryComponents,
  LibraryPrefix
} from "../typings/library-components";
import type { CustomElementTagNames } from "../typings/non-standard-elements";
import type { LibraryLoaderOptions } from "../typings/types";
import { autoLoadCustomElementsIfNeeded } from "./auto-load-custom-elements-if-needed.js";
import { setMutationObserver } from "./set-mutation-observer.js";

export const registerCustomElementLoaders = <Prefix extends LibraryPrefix>(
  options: LibraryLoaderOptions<Prefix>
) => {
  // Define the global config if not previously set
  globalThis.kasstorCoreCustomElementLoaders ??= {
    customElementLoaderPromises: new Map(),
    lazyLoadedCustomElements: new Set(),
    registeredLibraries: new Map(),
    registeredLoaders: new Map(),
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

  let atLeastOneNewCustomElementWasRegistered = false;

  // Register all new custom element loaders
  for (let index = 0; index < customElementTagNamesToRegister.length; index++) {
    const customElementTagName = customElementTagNamesToRegister[index];

    if (registeredLoaders.has(customElementTagName)) {
      console.warn(
        `The custom element "${customElementTagName}" was already registered by the "${registeredLoaders.get(customElementTagName)!.libraryName}" library, so its loader won't be replaced with the one from "${libraryName}" library.`
      );
    } else {
      atLeastOneNewCustomElementWasRegistered = true;

      const elementInfo = customElements[customElementTagName];

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

  if (atLeastOneNewCustomElementWasRegistered) {
    autoLoadCustomElementsIfNeeded();
  }
};
