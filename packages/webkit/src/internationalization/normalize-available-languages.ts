import { DEV_MODE } from "../development-flags.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getBaseSubtag } from "./get-base-subtag.js";
import { normalizeTag } from "./normalize-tag.js";
import type { KasstorLanguageSubtag, KasstorLanguageTag } from "./types";

/**
 * Normalized host config: the canonical tag set together with the
 * base-subtag index derived from it in the same pass. Both Sets are
 * always built in lockstep so they cannot drift; consumers store them
 * verbatim on the i18n globals.
 */
export type NormalizedAvailableLanguages = {
  languages: Set<KasstorLanguageTag>;
  baseSubtags: Set<KasstorLanguageSubtag>;
};

/**
 * Normalizes a list of available languages provided by the host application
 * into:
 *  - `languages`: a `Set<KasstorLanguageTag>` of canonical tags
 *  - `baseSubtags`: the corresponding `Set<KasstorLanguageSubtag>` (base
 *    subtag of each entry), used by `isLanguageAvailable` for O(1)
 *    wildcard-by-base lookups
 *
 * Behavior:
 * - Each entry is canonicalized via `normalizeTag` (base lowercased, region
 *   uppercased, base validated as a structurally valid BCP47 base subtag).
 * - Entries whose base is not structurally valid are dropped with a
 *   `DEV_MODE` warning.
 * - By default, guarantees that some `"en"`-based tag is in the resulting
 *   set: when the input is empty (or all entries are invalid), or none has
 *   base `"en"`, `"en"` is added and a `DEV_MODE` warning is emitted.
 * - When `strict` is `true`, the safety fallback is skipped and the
 *   resulting Sets reflect exactly the host-provided list. Hosts that
 *   intentionally want to forbid `"en"` should pass `strict: true`.
 */
export const normalizeAvailableLanguages = (
  input: ReadonlyArray<KasstorLanguageTag>,
  strict: boolean = false
): NormalizedAvailableLanguages => {
  const languages = new Set<KasstorLanguageTag>();
  const baseSubtags = new Set<KasstorLanguageSubtag>();
  let hasEnglishBase = false;

  for (const entry of input) {
    const canonical = normalizeTag(entry);
    if (canonical === undefined) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "${String(entry)}" is not a structurally valid BCP47 language tag and was skipped from "availableLanguages".`
        );
      }
      continue;
    }
    languages.add(canonical);
    const base = getBaseSubtag(canonical);
    baseSubtags.add(base);
    if (base === "en") {
      hasEnglishBase = true;
    }
  }

  if (strict) {
    return { languages, baseSubtags };
  }

  if (languages.size === 0) {
    if (DEV_MODE) {
      console.warn(
        '[kasstor i18n] "availableLanguages" was empty (or all entries were invalid); falling back to ["en"].'
      );
    }
    languages.add(DEFAULT_LANGUAGE);
    baseSubtags.add(DEFAULT_LANGUAGE);
    return { languages, baseSubtags };
  }

  if (!hasEnglishBase) {
    if (DEV_MODE) {
      console.warn(
        '[kasstor i18n] "availableLanguages" did not include "en"; adding it as the safety fallback.'
      );
    }
    languages.add(DEFAULT_LANGUAGE);
    baseSubtags.add(DEFAULT_LANGUAGE);
  }

  return { languages, baseSubtags };
};
