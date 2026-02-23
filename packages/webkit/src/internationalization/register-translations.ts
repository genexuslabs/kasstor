import { getI18nGlobals } from "./get-i18n-globals";
import { setLanguage } from "./set-language";
import type { KasstorTranslationShape, KasstorTranslationsLoader } from "./types";

/**
 * Registers translation loaders for a feature. Each language is loaded
 * asynchronously via the loader’s promise.
 *
 * @param featureId - Unique identifier for the feature (e.g. a component, a module, or the whole app).
 * @param loader - Object mapping each supported language to a function that
 *   returns a Promise of the translations for that language.
 *
 * Behavior:
 * - Replaces any existing loader for the same `featureId` (e.g. for HMR).
 * - If a loader already existed, a console warning is emitted.
 * - After registration, if a current language is set, translations for that
 *   language are requested.
 */
export const registerTranslations = <T extends KasstorTranslationShape>(
  featureId: string,
  loader: KasstorTranslationsLoader<T>
) => {
  // Single getI18nGlobals() call: currentLanguage and loaders for logic, cache for invalidation
  const { currentLanguage, translationLoaders, translationLoadCache } = getI18nGlobals();

  if (translationLoaders.has(featureId)) {
    console.warn(
      `The translations loader for the feature "${featureId}" has already been registered. This issue can occur when using Hot Module Replacement. Also, validate that your featureId is unique and you are not registering the translations multiple times.`
    );
  }

  // To improve the DX with HMR, we replace the translations loader anyways
  translationLoaders.set(featureId, loader);

  // Invalidate so the next setLanguage (below or elsewhere) runs loaders for all
  // features, including this one. Otherwise a cached Promise would skip the new loader.
  translationLoadCache.clear();

  if (currentLanguage) {
    setLanguage(currentLanguage);
  }
};
