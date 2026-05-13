import { isLanguageAvailable } from "./is-language-available.js";
import { normalizeTag } from "./normalize-tag.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns the first supported tag from `navigator.languages` that is
 * available under the host's configured set. Preserves the user's region
 * when possible.
 *
 * Resolution per entry, in order:
 * 1. Canonicalize the entry via `normalizeTag` (unsupported base → skip).
 * 2. If the canonical tag (with region, when present) is available, return it.
 * 3. If the bare base subtag is available, return the base subtag.
 *
 * Safe to call on the server: returns `null` when `navigator` is undefined.
 *
 * @returns The matching tag, or `null` if none of the user's preferred
 *   languages are supported and available.
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

    if (isLanguageAvailable(canonical)) {
      return canonical;
    }
  }

  return null;
};
