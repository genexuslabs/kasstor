import { DEV_MODE } from "../development-flags";
import type { CustomElementTagNames } from "./typings/non-standard-elements";

// An alias to "globalThis" to improve minification
const global = globalThis;

const storeTagNameToLazyLoadItAfterItHasALoader = (
  tagName: CustomElementTagNames
) => {
  global.kasstorCoreAttachedCustomElementsWithoutLoader ??= new Set();
  global.kasstorCoreAttachedCustomElementsWithoutLoader.add(tagName);
};

const markTheCustomElementAsLoaded = (tagName: CustomElementTagNames) => {
  global.kasstorCoreLoadedCustomElements ??= new Set();
  global.kasstorCoreLoadedCustomElements.add(tagName);

  global.kasstorCoreAttachedCustomElementsWithoutLoader?.delete(tagName);
};

export const loadComponent = (tagName: CustomElementTagNames) => {
  const { kasstorCoreCustomElementLoaders, kasstorCoreLoadedCustomElements } =
    global;

  // The element has been already loaded
  if (kasstorCoreLoadedCustomElements?.has(tagName)) {
    return;
  }
  const customElementWasManuallyRegistered =
    customElements.get(tagName) !== undefined;

  // No need to call the loader, as it was already loaded without using the
  // "loadComponent" function (for example, top level import)
  if (customElementWasManuallyRegistered) {
    return markTheCustomElementAsLoaded(tagName);
  }

  // No libraries registered and it was not manually registered. Register the
  // tagName
  if (kasstorCoreCustomElementLoaders === undefined) {
    if (
      DEV_MODE &&
      customElements.get(tagName) === undefined // The element was not "manually" registered
    ) {
      console.log(
        `[@genexus/kasstor-core]: The "${tagName}" can not be auto loaded, because it is not registered in any library. You must register it in a library, before trying to load it.`
      );
    }

    return storeTagNameToLazyLoadItAfterItHasALoader(tagName);
  }

  const { customElementLoaderPromises, registeredLoaders } =
    kasstorCoreCustomElementLoaders;
  const customElementLoaderPromise = customElementLoaderPromises.get(tagName);

  // The custom element is already being lazy loaded
  if (customElementLoaderPromise !== undefined) {
    return customElementLoaderPromise;
  }

  // The element doesn't have a loader and it was not "manually" registered.
  // Store its tagName to lazy loading it after a library has defined a loader
  // for it
  if (!registeredLoaders.has(tagName)) {
    if (DEV_MODE) {
      console.log(
        `[@genexus/kasstor-core]: The "${tagName}" can not be auto loaded, because it is not registered in any library. You must register it in a library, before trying to load it.`
      );
    }

    return storeTagNameToLazyLoadItAfterItHasALoader(tagName);
  }

  // The element was not "manually" registered, but the loader exists
  const { elementInfo } = registeredLoaders.get(tagName)!;

  const loaderPromise = elementInfo
    .loader()
    .then(() => {
      markTheCustomElementAsLoaded(tagName);
      customElementLoaderPromises.delete(tagName);
    })
    .catch(error =>
      console.error(
        `[@genexus/kasstor-core]: There was an error trying to load the "${tagName}" element.`,
        error
      )
    );

  // Store the promise to optimize lazy loading the same element multiple
  // times
  customElementLoaderPromises.set(tagName, loaderPromise);

  return loaderPromise;
};
