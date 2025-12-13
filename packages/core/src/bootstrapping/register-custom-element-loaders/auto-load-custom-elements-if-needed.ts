import { loadComponent } from "../load-component";
import type { CustomElementTagNames } from "../typings/non-standard-elements";

export const autoLoadCustomElementsIfNeeded = (
  customElementTagNamesWithNewLoaders: CustomElementTagNames[]
) => {
  const { kasstorCoreAttachedCustomElementsWithoutLoader } = globalThis;

  // The are no custom element waiting for its loader to be registered
  if (
    kasstorCoreAttachedCustomElementsWithoutLoader === undefined ||
    kasstorCoreAttachedCustomElementsWithoutLoader.size === 0
  ) {
    return;
  }

  // Check if there was a custom element waiting for its loader to be defined
  for (
    let index = 0;
    index < customElementTagNamesWithNewLoaders.length;
    index++
  ) {
    const tagName = customElementTagNamesWithNewLoaders[index];

    // The element was attached before its library's loader was set, so it
    // needs to be auto loaded
    if (kasstorCoreAttachedCustomElementsWithoutLoader.has(tagName)) {
      loadComponent(tagName);
    }
  }
};
