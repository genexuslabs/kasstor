import { getI18nGlobals } from "./get-i18n-globals";
import { setLanguage } from "./set-language";
import type {
  KasstorRegisterTranslationsOptions,
  KasstorTranslationShape,
  KasstorTranslationsLoader
} from "./types";

/**
 * Registers translation loaders for a feature. Each base subtag is loaded
 * asynchronously via the loader's promise. Region variants share the same
 * base-subtag loader.
 *
 * @param featureId - Unique identifier for the feature (e.g. a component, a module, or the whole app).
 * @param loader - Object mapping each supported base subtag to a function
 *   that returns a Promise of the translations for that subtag.
 * @param options - Optional configuration for this feature's translations.
 *
 * Behavior:
 * - Replaces any existing loader for the same `featureId` (e.g. for HMR).
 * - If a loader already existed, a console warning is emitted.
 * - Updates the preload registry based on `options.preloadTranslations`.
 * - Performs granular cache invalidation (only this feature, not all).
 * - After registration, if a current language is set and the feature has
 *   active subscribers or `preloadTranslations: true`, translations for
 *   that language are requested.
 */
export const registerTranslations = <T extends KasstorTranslationShape>(
  featureId: string,
  loader: KasstorTranslationsLoader<T>,
  options?: KasstorRegisterTranslationsOptions
) => {
  const {
    currentLanguage,
    translationLoaders,
    translationLoadCache,
    preloadFeatures,
    subscriberCounts
  } = getI18nGlobals();

  if (translationLoaders.has(featureId)) {
    console.warn(
      `The translations loader for the feature "${featureId}" has already been registered. This issue can occur when using Hot Module Replacement. Also, validate that your featureId is unique and you are not registering the translations multiple times.`
    );
  }

  // To improve the DX with HMR, we replace the translations loader anyways
  translationLoaders.set(featureId, loader);

  // Update preload registry
  if (options?.preloadTranslations) {
    preloadFeatures.add(featureId);
  } else {
    // HMR: handle flag removal when re-registering without preload
    preloadFeatures.delete(featureId);
  }

  // Granular cache invalidation: only clear THIS feature's cache entries
  // across all subtags, so other features keep their cached translations.
  for (const [, featureCache] of translationLoadCache) {
    featureCache.delete(featureId);
  }

  // Only trigger loading if language is set AND the feature should load now
  if (currentLanguage) {
    const hasSubscribers = (subscriberCounts.get(featureId) ?? 0) > 0;
    if (hasSubscribers || options?.preloadTranslations) {
      setLanguage(currentLanguage);
    }
  }
};
