// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// kasstor-webkit i18n manager.
//
// Subscriber/observer pattern for language-change notifications, async
// translation loading, and BCP47-tag (subtag + optional region) support
// open to any application-defined language universe.
//
// The host application declares its supported language set via
// `setInitialApplicationLanguage` (or `setAvailableLanguages` at runtime).
// kasstor does not maintain a static "supported languages" list: any
// structurally valid BCP47 tag is accepted as long as the host registers
// it. Direction (LTR / RTL) defaults from `RTL_LANGUAGES` and can be
// overridden via `registerLanguageDirection`.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export { RTL_LANGUAGES } from "./rtl-languages.js";

export { getAvailableLanguages } from "./get-available-languages.js";
export { getBaseSubtag } from "./get-base-subtag.js";
export { getClientLanguage } from "./get-client-language.js";
export { getCurrentLanguage } from "./get-current-language.js";
export { getCurrentTranslations } from "./get-current-translations.js";
export {
  getLanguageDirection,
  registerLanguageDirection
} from "./get-language-direction.js";
export { getLanguageFromUrl } from "./get-language-from-url.js";
export { isLanguageAvailable } from "./is-language-available.js";
export { isValidLanguage } from "./is-valid-language.js";
export { languageChangeComplete } from "./language-change-complete.js";
export { languageHasBeenInitialized } from "./language-has-been-initialized.js";
export { normalizeTag } from "./normalize-tag.js";
export { registerTranslations } from "./register-translations.js";
export { setAvailableLanguages } from "./set-available-languages.js";
export { setInitialApplicationLanguage } from "./set-initial-application-language.js";
export { setLanguage } from "./set-language.js";
export {
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "./subscriber.js";
export type * from "./types.js";
