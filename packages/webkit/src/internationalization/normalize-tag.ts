import type {
  KasstorLanguageSubtag,
  KasstorLanguageSubtagWithRegion,
  KasstorLanguageTag
} from "./types";

// BCP47 §2.2.1: language subtag is 2 or 3 ASCII alphabetic characters.
// Anchored regex; faster than a manual char-by-char loop and small enough
// to be JIT-cached.
const BASE_SUBTAG_REGEX = /^[a-z]{2,3}$/;

/**
 * Canonicalizes an arbitrary language string to a `KasstorLanguageTag`:
 * lowercases the base subtag, uppercases the region (when present), and
 * returns `undefined` if the base subtag does not match the BCP47 base
 * grammar (2–3 ASCII letters).
 *
 * Notes:
 * - The base subtag is validated structurally only — the function does
 *   NOT consult any host-configured "supported languages" list. Use
 *   `isLanguageAvailable` for that.
 * - Region content past the first dash is opaque: any non-empty string
 *   is preserved (uppercased). A trailing dash with empty region
 *   degrades to the bare base subtag.
 *
 * Examples:
 * - `"en"`     → `"en"`
 * - `"EN"`     → `"en"`
 * - `"en-us"`  → `"en-US"`
 * - `"en-"`    → `"en"`
 * - `"nl-NL"`  → `"nl-NL"`
 * - `"klingon"`→ `undefined`
 */
export const normalizeTag = (
  input: string
): KasstorLanguageTag | undefined => {
  if (typeof input !== "string" || input.length === 0) {
    return undefined;
  }

  const dashIndex = input.indexOf("-");
  const base = (
    dashIndex === -1 ? input : input.slice(0, dashIndex)
  ).toLowerCase();

  if (!BASE_SUBTAG_REGEX.test(base)) {
    return undefined;
  }

  if (dashIndex === -1) {
    return base as KasstorLanguageSubtag;
  }

  const region = input.slice(dashIndex + 1).toUpperCase();
  return region.length === 0
    ? (base as KasstorLanguageSubtag)
    : (`${base}-${region}` as KasstorLanguageSubtagWithRegion);
};
