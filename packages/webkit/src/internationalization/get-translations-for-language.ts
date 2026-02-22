import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguage } from "./types";

/**
 * Loads translations for the given language for all registered features.
 *
 * **Cache:** The Promise for each language is cached so that concurrent or
 * duplicate calls (e.g. two setLanguage flows for the same language) run
 * loaders only once. Cache is invalidated when loaders change (registerTranslations)
 * so newly registered features get their translations on the next load.
 *
 * **Performance:** Cache lookup is O(1). Loaders run in parallel per feature.
 * We avoid an extra async IIFE by caching the Promise.all result directly.
 */
export const getTranslationsForLanguage = <T extends KasstorLanguage>(language: T) => {
  const { loadedTranslations, translationLoaders, translationLoadCache } = getI18nGlobals();

  // Cache lookup is O(1)
  const cached = translationLoadCache.get(language);
  if (cached !== undefined) {
    return cached;
  }

  // Single pass over loaders: build one array of promises, then await all.
  // Avoids extra .map() allocation and async IIFE wrapper.
  const loadPromises: Promise<void>[] = [];

  for (const [featureId, loader] of translationLoaders) {
    loadPromises.push(
      loader[language]().then(translations => {
        const featureTranslations = loadedTranslations.get(featureId);

        // If the translations for the feature are not loaded, we set them
        if (featureTranslations === undefined) {
          loadedTranslations.set(featureId, new Map([[language, translations]]));
        } else {
          featureTranslations.set(language, translations);
        }
      })
    );
  }

  const loadPromise = Promise.all(loadPromises).then(() => {});

  translationLoadCache.set(language, loadPromise);
  return loadPromise;
};
