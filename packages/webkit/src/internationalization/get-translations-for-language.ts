import { getBaseSubtag } from "./get-base-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Loads translations for a single feature+subtag pair, using a per-feature
 * cache. Returns the cached Promise if already in-flight or resolved.
 */
const loadFeatureTranslation = (
  subtag: KasstorLanguageSubtag,
  featureId: string
): Promise<void> => {
  const { loadedTranslations, translationLoaders, translationLoadCache } =
    getI18nGlobals();

  let featureCache = translationLoadCache.get(subtag);
  if (featureCache === undefined) {
    featureCache = new Map();
    translationLoadCache.set(subtag, featureCache);
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

  const promise = loader[subtag]().then(translations => {
    const featureTranslations = loadedTranslations.get(featureId);

    if (featureTranslations === undefined) {
      loadedTranslations.set(featureId, new Map([[subtag, translations]]));
    } else {
      featureTranslations.set(subtag, translations);
    }
  });

  featureCache.set(featureId, promise);
  return promise;
};

/**
 * Loads translations for the given subtag for features that have active
 * subscribers or are marked with `preloadTranslations: true`.
 *
 * **Cache:** Each feature+subtag pair is cached individually so concurrent
 * or duplicate calls run loaders only once. Cache entries are invalidated
 * per-feature when loaders change (`registerTranslations`).
 *
 * **Performance:** Feature loaders run in parallel via `Promise.all`. Only
 * features with active subscribers or the preload flag are loaded.
 */
export const getTranslationsForLanguage = (
  subtag: KasstorLanguageSubtag
): Promise<void> => {
  const { translationLoaders, subscriberCounts, preloadFeatures } =
    getI18nGlobals();

  const loadPromises: Promise<void>[] = [];

  for (const [featureId] of translationLoaders) {
    const hasSubscribers = (subscriberCounts.get(featureId) ?? 0) > 0;
    const shouldPreload = preloadFeatures.has(featureId);

    if (hasSubscribers || shouldPreload) {
      loadPromises.push(loadFeatureTranslation(subtag, featureId));
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
 * feature+subtag pair does not produce duplicate requests.
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
  return loadFeatureTranslation(getBaseSubtag(currentLanguage), featureId);
};
