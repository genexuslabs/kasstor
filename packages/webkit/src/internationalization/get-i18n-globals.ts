// Alias to improve minification
const global = globalThis;

export const getI18nGlobals = () => {
  let languageInitializedResolver: (() => void) | undefined;

  global.kasstorWebkitI18n ??= {
    currentLanguage: undefined,
    languageInitialized: new Promise(resolve => {
      languageInitializedResolver = resolve;
    }),
    // Initially resolved: with no language change in flight, awaiting
    // `languageChangeComplete()` should not block.
    languageChangePromise: Promise.resolve(),
    loadedTranslations: new Map(),
    translationLoaders: new Map(),

    /**
     * Cache of load Promises per language (one entry per language, bounded).
     * Deduplicates concurrent or repeated getTranslationsForLanguage(lang) so
     * loaders run once per language. Cleared on registerTranslations so new
     * features are included in the next load. Reset with globals on test teardown.
     */
    translationLoadCache: new Map(),
    subscriberCounts: new Map(),
    preloadFeatures: new Set()
  };
  global.kasstorWebkitI18n.internalLanguageInitializedResolver ??= languageInitializedResolver;

  return global.kasstorWebkitI18n!;
};

