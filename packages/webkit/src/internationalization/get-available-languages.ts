import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the canonical `availableLanguages` set the host configured via
 * `setInitialApplicationLanguage` or `setAvailableLanguages`, or
 * `undefined` when the host has not declared a list (in which case every
 * structurally valid tag is considered available).
 *
 * The returned set is read-only and shares its identity with the live
 * globals: callers must not mutate it.
 */
export const getAvailableLanguages = ():
  | ReadonlySet<KasstorLanguageTag>
  | undefined => getI18nGlobals().availableLanguages;
