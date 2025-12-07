import { DEV_MODE } from "../development-flags";
import type { CustomElementTagNames } from "./typings/non-standard-elements";

export const loadComponent = (tagName: CustomElementTagNames) => {
  const { kasstorCoreCustomElementLoaders } = globalThis;

  // No libraries registered
  if (kasstorCoreCustomElementLoaders === undefined) {
    if (
      DEV_MODE &&
      customElements.get(tagName) === undefined // The element was not "manually" registered
    ) {
      console.log(
        `[@genexus/kasstor-core]: The "${tagName}" can not be auto loaded, because it is not registered in any library. You must register it in a library, before trying to load it.`
      );
    }

    return;
  }
  const { lazyLoadedCustomElements, registeredLoaders } =
    kasstorCoreCustomElementLoaders;

  // The element has been already loaded or the element doesn't have a loader
  if (
    lazyLoadedCustomElements.has(tagName) ||
    !registeredLoaders.has(tagName)
  ) {
    if (
      DEV_MODE &&
      customElements.get(tagName) === undefined && // The element was not "manually" registered
      !registeredLoaders.has(tagName) // It doesn't have a loader
    ) {
      console.log(
        `[@genexus/kasstor-core]: The "${tagName}" can not be auto loaded, because it is not registered in any library. You must register it in a library, before trying to load it.`
      );
    }

    return;
  }

  // The element was not "manually" registered, but the loader exists
  if (customElements.get(tagName) === undefined) {
    const { elementInfo } = registeredLoaders.get(tagName)!;

    return elementInfo
      .loader()
      .then(() => {
        // Mark the component as loaded
        lazyLoadedCustomElements.add(tagName);
      })
      .catch(error =>
        console.error(
          `[@genexus/kasstor-core]: There was an error trying to load the "${tagName}" element.`,
          error
        )
      );
  }

  // Mark the component as loaded
  lazyLoadedCustomElements.add(tagName);
  return undefined;
};
