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
 * - Always guarantees that `"en"` is in the resulting Set: when the input is
 *   empty (or becomes empty after filtering), or does not include `"en"`,
 *   `"en"` is added and a warning is emitted in `DEV_MODE`.
 *
 * @param input - Array of language full names or subtags.
 * @returns A `Set` of language subtags that always contains `"en"`.
 */
export const normalizeAvailableLanguages = (
  input: ReadonlyArray<KasstorLanguage | KasstorLanguageSubtag>
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
