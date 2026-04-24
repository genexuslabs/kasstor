export { insertIntoIndex, removeIndex } from "./array/index.js";

export { SyncWithRAF } from "./sync-with-frames/index.js";

export { TypeAhead } from "./type-ahead/index.js";

export {
  addGlobalStyleSheet,
  addStyleSheet,
  removeGlobalStyleSheet,
  removeStyleSheet
} from "./global-stylesheets/index.js";

// i18n
export {
  ALL_SUPPORTED_LANGUAGE_SUBTAGS,
  fromLanguageFullnameToSubtag,
  fromLanguageToFullnameAndSubtag,
  getClientLanguage,
  getCurrentLanguage,
  getCurrentTranslations,
  getLanguageFromUrl,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges,
  type KasstorLanguage,
  type KasstorLanguageFullnameAndSubtag,
  type KasstorLanguageSubtag,
  type KasstorLanguageSubtagWithRegion,
  type KasstorTranslationShape,
  type KasstorTranslations,
  type KasstorTranslationsLoader
} from "./internationalization/index.js";

export type { FilterObjectKeys } from "./typings/filter-keys.js";
export type { ObjectEntries } from "./typings/object-entries.js";

