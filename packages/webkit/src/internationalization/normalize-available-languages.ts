import { DEV_MODE } from "../development-flags.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { normalizeTag } from "./normalize-tag.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Normalizes a list of available languages provided by the host application
 * into an internal `Set<KasstorLanguageTag>` of canonical tags.
 *
 * Behavior:
 * - Each entry is canonicalized via `normalizeTag` (base lowercased, region
 *   uppercased, base validated against `ALL_SUPPORTED_LANGUAGE_SUBTAGS`).
 * - Entries whose base is not supported are dropped with a `DEV_MODE` warning.
 * - By default, guarantees that `"en"` is in the resulting Set: when the
 *   input is empty (or all entries are invalid), or none has base `"en"`,
 *   `"en"` is added and a `DEV_MODE` warning is emitted. This is the
 *   historical safety fallback.
 * - When `strict` is `true`, the safety fallback is skipped and the resulting
 *   Set reflects exactly the host-provided list. Hosts that intentionally
 *   want to forbid `"en"` should pass `strict: true`.
 *
 * @param input - Array of language tags.
 * @param strict - When `true`, do not auto-add `"en"` as a safety fallback.
 *   Defaults to `false`.
 * @returns A `Set` of canonical language tags.
 */
export const normalizeAvailableLanguages = (
  input: ReadonlyArray<KasstorLanguageTag>,
  strict: boolean = false
): Set<KasstorLanguageTag> => {
  const normalized = new Set<KasstorLanguageTag>();

  for (const entry of input) {
    const canonical = normalizeTag(entry);
    if (canonical === undefined) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "${String(entry)}" is not a supported language tag and was skipped from "availableLanguages".`
        );
      }
      continue;
    }
    normalized.add(canonical);
  }

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

  // Ensure at least one entry has base "en"
  let hasEnglishBase = false;
  for (const entry of normalized) {
    if (entry === "en" || entry.startsWith("en-")) {
      hasEnglishBase = true;
      break;
    }
  }

  if (!hasEnglishBase) {
    if (DEV_MODE) {
      console.warn(
        '[kasstor i18n] "availableLanguages" did not include "en"; adding it as the safety fallback.'
      );
    }
    normalized.add(DEFAULT_LANGUAGE);
  }

  return normalized;
};
