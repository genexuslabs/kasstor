// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// This manager implements a subscriber/observer pattern for subscribing to
// language changes and notifying the observers when the current language is
// changed.
// It also provides functions to get and set the current language, register
// translations, and retrieve the current translations.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";

export { fromLanguageFullnameToSubtag } from "./from-language-fullname-to-subtag.js";
export { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag.js";
export { getClientLanguage } from "./get-client-language.js";
export { getCurrentLanguage } from "./get-current-language.js";
export { getCurrentTranslations } from "./get-current-translations.js";
export { getLanguageFromUrl } from "./get-language-from-url.js";
export { registerTranslations } from "./register-translations.js";
export { setInitialApplicationLanguage } from "./set-initial-application-language.js";
export { setLanguage } from "./set-language.js";
export {
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "./subscriber.js";
export type * from "./types";

