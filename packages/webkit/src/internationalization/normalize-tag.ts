import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import type { KasstorLanguageSubtag, KasstorLanguageTag } from "./types";

/**
 * Normalizes an arbitrary language string to a canonical `KasstorLanguageTag`:
 * - Lowercases the base subtag.
 * - Uppercases the region (when present).
 * - Returns `undefined` if the base is not a supported `KasstorLanguageSubtag`.
 *
 * Examples:
 * - `"en"` → `"en"`
 * - `"EN"` → `"en"`
 * - `"en-us"` → `"en-US"`
 * - `"en-US"` → `"en-US"`
 * - `"klingon"` → `undefined`
 */
export const normalizeTag = (input: string): KasstorLanguageTag | undefined => {
  if (typeof input !== "string" || input.length === 0) {
    return undefined;
  }

  const dashIndex = input.indexOf("-");
  const base = (dashIndex === -1 ? input : input.slice(0, dashIndex)).toLowerCase();

  if (!ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(base as KasstorLanguageSubtag)) {
    return undefined;
  }

  if (dashIndex === -1) {
    return base as KasstorLanguageSubtag;
  }

  const region = input.slice(dashIndex + 1).toUpperCase();
  if (region.length === 0) {
    return base as KasstorLanguageSubtag;
  }

  return `${base as KasstorLanguageSubtag}-${region}`;
};
