import { getBaseSubtag } from "./get-base-subtag.js";
import { RTL_LANGUAGES } from "./rtl-languages.js";
import type { KasstorLanguageTag } from "./types";

const overrides = new Map<string, "ltr" | "rtl">();

/**
 * Overrides the writing direction for a base subtag.
 *
 * Useful for private-use or niche locales where the default heuristic
 * ("rtl" for `RTL_LANGUAGES` members, "ltr" for everything else) is
 * wrong. Re-registering the same subtag overrides the previous value.
 *
 * The override applies to ALL region variants of the base subtag — e.g.
 * `registerLanguageDirection("ku", "rtl")` makes both `"ku"` and
 * `"ku-IQ"` resolve to `"rtl"`.
 *
 * Call from the host bootstrap (before `setInitialApplicationLanguage`)
 * for the most predictable behavior.
 */
export const registerLanguageDirection = (
  subtag: string,
  direction: "ltr" | "rtl"
): void => {
  overrides.set(subtag.toLowerCase(), direction);
};

/**
 * Returns the writing direction (`"ltr"` or `"rtl"`) for a language tag.
 *
 * Resolution order:
 *   1. Explicit override via `registerLanguageDirection`.
 *   2. Membership in the curated `RTL_LANGUAGES` set.
 *   3. Fallback to `"ltr"`.
 *
 * The lookup is O(1) — one `Map.get` plus one `Set.has`, both keyed by
 * the base subtag (region is irrelevant to direction).
 */
export const getLanguageDirection = (
  tag: KasstorLanguageTag
): "ltr" | "rtl" => {
  const base = getBaseSubtag(tag);
  const override = overrides.get(base);
  if (override !== undefined) {
    return override;
  }
  return RTL_LANGUAGES.has(base) ? "rtl" : "ltr";
};
