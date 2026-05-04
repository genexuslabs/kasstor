import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageSubtag } from "./types";

/**
 * Returns whether `subtag` is part of the host's `availableLanguages`.
 *
 * When the host has not configured `availableLanguages`, every subtag is
 * considered available (legacy behavior — no restriction is applied).
 *
 * Note: this is **not** the same as `isValidLanguage`, which checks whether
 * a string is a supported subtag at all. A subtag can be valid but not
 * available (e.g. supported by the library but excluded by the host). When
 * `availableLanguages` is `undefined`, this function does not validate that
 * `subtag` is a real supported subtag — call `isValidLanguage` first if you
 * need that guarantee.
 *
 * @param subtag - Language subtag to check.
 */
export const isLanguageAvailable = (subtag: KasstorLanguageSubtag): boolean => {
  const { availableLanguages } = getI18nGlobals();
  return availableLanguages === undefined || availableLanguages.has(subtag);
};
