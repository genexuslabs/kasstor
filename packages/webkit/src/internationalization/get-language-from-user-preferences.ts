import { normalizeTag } from "./normalize-tag.js";
import { resolveAvailableLanguage } from "./resolve-available-language.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the first `navigator.languages` entry that resolves under the
 * host's declared `availableLanguages` set, in the host's declared form.
 *
 * Resolution per entry:
 *   1. Canonicalize via `normalizeTag` (structurally invalid → skip).
 *   2. Map to the host's declared form via `resolveAvailableLanguage`
 *      (exact match preserved; otherwise narrowed to the base subtag
 *      when the host only declared the base).
 *
 * Safe to call on the server: returns `null` when `navigator` is
 * undefined.
 */
export const getLanguageFromUserPreferences = (): KasstorLanguageTag | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const preferredLanguages = navigator.languages;

  for (let index = 0; index < preferredLanguages.length; index++) {
    const canonical = normalizeTag(preferredLanguages[index]);
    if (canonical === undefined) {
      continue;
    }
    const resolved = resolveAvailableLanguage(canonical);
    if (resolved !== undefined) {
      return resolved;
    }
  }

  return null;
};
