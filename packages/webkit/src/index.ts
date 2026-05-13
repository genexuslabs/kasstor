export { insertIntoIndex, removeIndex } from "./array/index.js";

export { SyncWithRAF } from "./sync-with-frames/index.js";

export { TypeAhead } from "./type-ahead/index.js";

export {
  addGlobalStyleSheet,
  addStyleSheet,
  removeGlobalStyleSheet,
  removeStyleSheet
} from "./stylesheets/index.js";

// i18n
export {
  ALL_SUPPORTED_LANGUAGE_SUBTAGS,
  getClientLanguage,
  getCurrentLanguage,
  getCurrentTranslations,
  getLanguageFromUrl,
  languageChangeComplete,
  languageHasBeenInitialized,
  registerTranslations,
  setAvailableLanguages,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges,
  type KasstorLanguageSubtag,
  type KasstorLanguageSubtagWithRegion,
  type KasstorLanguageTag,
  type KasstorTranslationShape,
  type KasstorTranslationsLoader
} from "./internationalization/index.js";

export type { FilterObjectKeys } from "./typings/filter-keys.js";
export type { ObjectEntries } from "./typings/object-entries.js";

