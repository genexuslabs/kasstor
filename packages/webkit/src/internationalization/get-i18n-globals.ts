export const getI18nGlobals = () => {
  globalThis.kasstorWebkitI18n! ??= {
    currentLanguage: undefined,
    loadedTranslations: new Map(),
    translationLoaders: new Map()
  };
  return globalThis.kasstorWebkitI18n!;
};

