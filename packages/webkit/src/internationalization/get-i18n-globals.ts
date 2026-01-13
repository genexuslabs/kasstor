// Alias to improve minification
const global = globalThis;

export const getI18nGlobals = () => {
  let languageInitializedResolver: (() => void) | undefined;

  global.kasstorWebkitI18n ??= {
    currentLanguage: undefined,
    languageInitialized: new Promise(resolve => {
      languageInitializedResolver = resolve;
    }),
    loadedTranslations: new Map(),
    translationLoaders: new Map()
  };
  global.kasstorWebkitI18n.internalLanguageInitializedResolver ??=
    languageInitializedResolver;

  return global.kasstorWebkitI18n!;
};

