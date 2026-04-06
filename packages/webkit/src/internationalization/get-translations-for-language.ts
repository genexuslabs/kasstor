import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguage } from "./types";

/**
 * Loads translations for a single feature+language pair, using per-feature
 * cache. Returns the cached Promise if already in-flight or resolved.
 */
const loadFeatureTranslation = (
  language: KasstorLanguage,
  featureId: string
): Promise<void> => {
  const { loadedTranslations, translationLoaders, translationLoadCache } = getI18nGlobals();

  let featureCache = translationLoadCache.get(language);
  if (featureCache === undefined) {
    featureCache = new Map();
    translationLoadCache.set(language, featureCache);
  }

  // Cache lookup is O(1)
  const cached = featureCache.get(featureId);
  if (cached !== undefined) {
    return cached;
  }

  const loader = translationLoaders.get(featureId);
  if (loader === undefined) {
    // No loader registered yet; resolve immediately. Cache entry will be
    // cleared by registerTranslations when the loader is added later.
    const resolved = Promise.resolve();
    featureCache.set(featureId, resolved);
    return resolved;
  }

  const promise = loader[language]().then(translations => {
    const featureTranslations = loadedTranslations.get(featureId);

    // If the translations for the feature are not loaded, we set them
    if (featureTranslations === undefined) {
      loadedTranslations.set(featureId, new Map([[language, translations]]));
    } else {
      featureTranslations.set(language, translations);
    }
  });

  featureCache.set(featureId, promise);
  return promise;
};

/**
 * Loads translations for the given language for features that have active
 * subscribers or are marked with `preloadTranslations: true`.
 *
 * **Cache:** Each feature+language pair is cached individually so that
 * concurrent or duplicate calls run loaders only once. Cache entries are
 * invalidated per-feature when loaders change (registerTranslations).
 *
 * **Performance:** Feature loaders run in parallel via Promise.all.
 * Only features with active subscribers or preload flag are loaded,
 * skipping unnecessary network requests.
 */
export const getTranslationsForLanguage = <T extends KasstorLanguage>(language: T) => {
  const { translationLoaders, subscriberCounts, preloadFeatures } = getI18nGlobals();

  const loadPromises: Promise<void>[] = [];

  for (const [featureId] of translationLoaders) {
    const hasSubscribers = (subscriberCounts.get(featureId) ?? 0) > 0;
    const shouldPreload = preloadFeatures.has(featureId);

    if (hasSubscribers || shouldPreload) {
      loadPromises.push(loadFeatureTranslation(language, featureId));
    }
  }

  return Promise.all(loadPromises).then(() => {});
};

/**
 * Ensures translations for a specific feature are loaded for the current
 * language. Used by the subscriber system to trigger on-demand loading when
 * a new subscriber appears for a feature that wasn't loaded during the last
 * `getTranslationsForLanguage` call.
 *
 * Uses the per-feature cache, so calling this multiple times for the same
 * feature+language pair does not produce duplicate requests.
 *
 * @returns The load Promise, or `undefined` if no language is set yet.
 */
export const ensureFeatureTranslationsLoaded = (
  featureId: string
): Promise<void> | undefined => {
  const { currentLanguage } = getI18nGlobals();
  if (currentLanguage === undefined) {
    return undefined;
  }
  return loadFeatureTranslation(currentLanguage, featureId);
};
