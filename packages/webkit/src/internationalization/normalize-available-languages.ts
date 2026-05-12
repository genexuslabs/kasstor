import { DEV_MODE } from "../development-flags.js";
import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { fromLanguageFullnameToSubtag } from "./from-language-fullname-to-subtag.js";
import type { KasstorLanguage, KasstorLanguageSubtag } from "./types";

/**
 * Normalizes a list of available languages provided by the host application
 * into an internal `Set<KasstorLanguageSubtag>`.
 *
 * Behavior:
 * - Accepts both full names (`"english"`) and subtags (`"en"`).
 * - Drops entries that are not part of `ALL_SUPPORTED_LANGUAGE_SUBTAGS` (with
 *   a warning in `DEV_MODE`).
 * - By default, guarantees that `"en"` is in the resulting Set: when the
 *   input is empty (or becomes empty after filtering), or does not include
 *   `"en"`, `"en"` is added and a warning is emitted in `DEV_MODE`. This is
 *   the historical safety fallback so an app with a misconfigured list still
 *   has a known-good language available.
 * - When `strict` is `true`, the safety fallback is skipped and the resulting
 *   Set reflects exactly the host-provided list (after dropping unsupported
 *   entries). Hosts that intentionally want to forbid `"en"` (or that
 *   pre-validate their list and want kasstor to honor it verbatim) should
 *   pass `strict: true`. Note that an empty result in strict mode means no
 *   language is available — `isLanguageAvailable` will return `false` for
 *   every subtag — so the host is responsible for ensuring at least one
 *   valid entry.
 *
 * @param input - Array of language full names or subtags.
 * @param strict - When `true`, do not auto-add `"en"` as a safety fallback.
 *   Defaults to `false` to preserve backwards-compatible behavior.
 * @returns A `Set` of language subtags. Contains `"en"` unless `strict` is
 *   `true` and the host did not include it.
 */
export const normalizeAvailableLanguages = (
  input: ReadonlyArray<KasstorLanguage | KasstorLanguageSubtag>,
  strict: boolean = false
): Set<KasstorLanguageSubtag> => {
  const normalized = new Set<KasstorLanguageSubtag>();

  for (const entry of input) {
    // Reject unsupported strings defensively (could happen if the host bypasses
    // the type system, e.g. data coming from a config file).
    let subtag: KasstorLanguageSubtag | undefined;
    if (ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(entry as KasstorLanguageSubtag)) {
      subtag = entry as KasstorLanguageSubtag;
    } else {
      // `fromLanguageFullnameToSubtag` returns `undefined` for non-fullname
      // inputs because it's a plain dictionary lookup typed against
      // `KasstorLanguage`.
      subtag = fromLanguageFullnameToSubtag(entry as KasstorLanguage);
    }

    if (subtag === undefined) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "${String(entry)}" is not a supported language and was skipped from "availableLanguages".`
        );
      }
      continue;
    }

    normalized.add(subtag);
  }

  // Strict mode: respect the host's list verbatim; skip the safety fallback.
  if (strict) {
    return normalized;
  }

  if (normalized.size === 0) {
    if (DEV_MODE) {
      console.warn(
        '[kasstor i18n] "availableLanguages" was empty (or all entries were invalid); falling back to ["en"].'
      );
    }
    normalized.add(DEFAULT_LANGUAGE);
    return normalized;
  }

  if (!normalized.has(DEFAULT_LANGUAGE)) {
    if (DEV_MODE) {
      console.warn(
        '[kasstor i18n] "availableLanguages" did not include "en"; adding it as the safety fallback.'
      );
    }
    normalized.add(DEFAULT_LANGUAGE);
  }

  return normalized;
};
