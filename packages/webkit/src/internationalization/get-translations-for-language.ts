import { getBaseSubtag } from "./get-base-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type {
  KasstorLanguageTag,
  KasstorTranslationShape,
  KasstorTranslationsLoader
} from "./types";

/**
 * Resolves which loader entry should serve `tag` for a feature.
 *
 *  - Returns the full `tag` if the loader carries an explicit regional
 *    entry for it (e.g. an `"es-ES"` override).
 *  - Falls back to the base subtag (e.g. `"es"`) when only the base is
 *    provided.
 *  - Returns `undefined` when neither key has a loader entry — callers
 *    treat that as "this feature has no translations for `tag`".
 */
const resolveLoaderKey = <T extends KasstorTranslationShape>(
  loader: KasstorTranslationsLoader<T>,
  tag: KasstorLanguageTag
): KasstorLanguageTag | undefined => {
  if (loader[tag] !== undefined) {
    return tag;
  }
  const base = getBaseSubtag(tag);
  if (loader[base] !== undefined) {
    return base;
  }
  return undefined;
};

/**
 * Loads translations for a single feature+tag pair, using a per-feature
 * cache keyed by the resolved loader key. Returns the cached Promise if
 * already in-flight or resolved.
 *
 * When no loader is registered yet, the cache entry is keyed by the full
 * tag so a later `registerTranslations` (which clears feature entries
 * across all cache keys) reliably invalidates it.
 */
const loadFeatureTranslation = (
  tag: KasstorLanguageTag,
  featureId: string
): Promise<void> => {
  const { loadedTranslations, translationLoaders, translationLoadCache } =
    getI18nGlobals();

  const loader = translationLoaders.get(featureId);

  // No loader registered yet — resolve immediately so a subscriber awaiting
  // this feature does not block. Cache under the full tag so a later
  // `registerTranslations` can clear it during cross-key invalidation.
  if (loader === undefined) {
    let featureCache = translationLoadCache.get(tag);
    if (featureCache === undefined) {
      featureCache = new Map();
      translationLoadCache.set(tag, featureCache);
    }
    const cached = featureCache.get(featureId);
    if (cached !== undefined) {
      return cached;
    }
    const resolved = Promise.resolve();
    featureCache.set(featureId, resolved);
    return resolved;
  }

  const loadKey = resolveLoaderKey(loader, tag);
  if (loadKey === undefined) {
    // This feature's loader has neither the full tag nor the base subtag;
    // nothing to load. `getCurrentTranslations` will return `undefined`.
    return Promise.resolve();
  }

  let featureCache = translationLoadCache.get(loadKey);
  if (featureCache === undefined) {
    featureCache = new Map();
    translationLoadCache.set(loadKey, featureCache);
  }

  // Cache lookup is O(1)
  const cached = featureCache.get(featureId);
  if (cached !== undefined) {
    return cached;
  }

  const promise = loader[loadKey]!().then(translations => {
    const featureTranslations = loadedTranslations.get(featureId);

    if (featureTranslations === undefined) {
      loadedTranslations.set(featureId, new Map([[loadKey, translations]]));
    } else {
      featureTranslations.set(loadKey, translations);
    }
  });

  featureCache.set(featureId, promise);
  return promise;
};

/**
 * Loads translations for the given language tag for features that have
 * active subscribers or are marked with `preloadTranslations: true`.
 *
 * **Per-feature resolution:** each feature independently resolves the
 * `tag` to either its regional loader entry (when present) or the base
 * subtag entry (fallback). So a single `setLanguage("es-ES")` may load a
 * regional file for one feature and the base file for another, all in
 * parallel.
 *
 * **Cache:** Each feature+loadKey pair is cached individually so
 * concurrent or duplicate calls run loaders only once. Cache entries are
 * invalidated per-feature when loaders change (`registerTranslations`).
 *
 * **Performance:** Feature loaders run in parallel via `Promise.all`.
 * Only features with active subscribers or the preload flag are loaded.
 */
export const getTranslationsForLanguage = (
  tag: KasstorLanguageTag
): Promise<void> => {
  const { translationLoaders, subscriberCounts, preloadFeatures } =
    getI18nGlobals();

  const loadPromises: Promise<void>[] = [];

  for (const [featureId] of translationLoaders) {
    const hasSubscribers = (subscriberCounts.get(featureId) ?? 0) > 0;
    const shouldPreload = preloadFeatures.has(featureId);

    if (hasSubscribers || shouldPreload) {
      loadPromises.push(loadFeatureTranslation(tag, featureId));
    }
  }

  return Promise.all(loadPromises).then(() => {});
};

/**
 * Ensures translations for a specific feature are loaded for the current
 * language. Used by the subscriber system to trigger on-demand loading
 * when a new subscriber appears for a feature that wasn't loaded during
 * the last `getTranslationsForLanguage` call.
 *
 * Uses the per-feature cache, so calling this multiple times for the same
 * feature+tag pair does not produce duplicate requests.
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
