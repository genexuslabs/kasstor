import { applyI18nConfig } from "./apply-i18n-config.js";
import { fromLanguageFullnameToSubtag } from "./from-language-fullname-to-subtag.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import { getLanguageFromUserPreferences } from "./get-language-from-user-preferences.js";
import { isLanguageAvailable } from "./is-language-available.js";
import { resolveDefaultLanguage } from "./resolve-default-language.js";
import { setLanguage } from "./set-language.js";
import type { KasstorLanguage, KasstorLanguageSubtag } from "./types";

/**
 * Updates the host's `availableLanguages` and/or `defaultLanguage` at runtime.
 *
 * If the current language is no longer available after the update, the
 * resolution chain is — per spec — *navigator first, then default* (no
 * `localStorage` lookup, since the persisted value reflects the user's prior
 * choice and is overwritten by the upcoming `setLanguage` call):
 *   1. The first match from `navigator.languages` that is now available.
 *   2. The configured `defaultLanguage` (post-update).
 *
 * Then `setLanguage` is invoked with the resolved language to load
 * translations, notify subscribers, persist to localStorage, and update the
 * URL — exactly as a normal language change.
 *
 * Important:
 * - At least one of `availableLanguages` / `defaultLanguage` must be provided.
 * - By default, `availableLanguages = []` is coerced to `["en"]` with a
 *   warning in `DEV_MODE`, and lists missing `"en"` get it auto-added. Pass
 *   `strict: true` to disable this safety fallback and have kasstor honor
 *   the list verbatim — useful when the host explicitly wants to forbid
 *   `"en"` (e.g. a Spanish-only deployment).
 * - A `defaultLanguage` not in `availableLanguages` is coerced to `"en"` with
 *   a warning. Same applies to a previously-configured default that is no
 *   longer in the new list. (In `strict` mode, hosts should ensure the
 *   default is one of the supplied entries; the coercion to `"en"` still
 *   runs but the result may not be reachable.)
 * - Registration of translations (`registerTranslations`) is **not** affected
 *   by this list — hosts can keep registering translations for languages
 *   that are not currently exposed.
 *
 * @param options - Configuration to apply.
 * @throws Error when neither `availableLanguages` nor `defaultLanguage` is provided.
 */
export const setAvailableLanguages = (options: {
  availableLanguages?: ReadonlyArray<KasstorLanguage | KasstorLanguageSubtag>;
  defaultLanguage?: KasstorLanguage | KasstorLanguageSubtag;
  strict?: boolean;
}): void => {
  if (options.availableLanguages === undefined && options.defaultLanguage === undefined) {
    throw new Error(
      '"setAvailableLanguages" requires at least one of "availableLanguages" or "defaultLanguage".'
    );
  }

  applyI18nConfig(options);

  const { currentLanguage } = getI18nGlobals();

  // Nothing to switch when the language has not been initialized yet — the
  // future `setInitialApplicationLanguage` will use the new config.
  if (currentLanguage === undefined) {
    return;
  }

  if (isLanguageAvailable(fromLanguageFullnameToSubtag(currentLanguage))) {
    return;
  }

  const newSubtag = getLanguageFromUserPreferences() ?? resolveDefaultLanguage();

  // Trigger the standard language change flow (URL update, callbacks,
  // subscribers, localStorage).
  setLanguage(newSubtag, true);
};
