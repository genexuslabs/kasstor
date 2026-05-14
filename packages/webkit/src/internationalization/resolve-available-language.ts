import { getBaseSubtag } from "./get-base-subtag.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Resolves an arbitrary canonical tag to the form the host explicitly
 * declared in `availableLanguages`.
 *
 * Single rule for matching against the host's declared universe (URL,
 * `localStorage` and `navigator.languages` all share it):
 *  1. No list configured → open universe; return `tag` as-is.
 *  2. Exact member of `availableLanguages` → return `tag` (regional
 *     variant preserved when the host opted in to that variant).
 *  3. Base subtag is a wildcard match in `availableBaseSubtags` → return
 *     the base subtag (the host did NOT declare the regional variant;
 *     narrow to the form it did declare).
 *  4. Otherwise → `undefined`.
 *
 * Always returning the host's declared form (rather than the user's
 * regional preference) keeps `<html lang>`, URL prefixes and translation
 * lookups consistent with what the host advertises via
 * `getAvailableLanguages()`.
 */
export const resolveAvailableLanguage = (
  tag: KasstorLanguageTag
): KasstorLanguageTag | undefined => {
  const { availableLanguages, availableBaseSubtags } = getI18nGlobals();
  if (availableLanguages === undefined || availableBaseSubtags === undefined) {
    return tag;
  }
  if (availableLanguages.has(tag)) {
    return tag;
  }
  const base = getBaseSubtag(tag);
  if (availableBaseSubtags.has(base)) {
    return base;
  }
  return undefined;
};
