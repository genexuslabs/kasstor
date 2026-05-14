/**
 * BCP47 base subtags whose default script is written right-to-left.
 *
 * Curated from Unicode CLDR. Only base subtags are stored — regions and
 * scripts do not affect direction (e.g. `"ar"`, `"ar-SA"` and `"ar-EG"`
 * are all RTL). This keeps the set small and the lookup O(1) via
 * `getBaseSubtag(tag)`.
 *
 * Applications that need to support a language outside this set, or
 * override the default direction for a base subtag, can call
 * `registerLanguageDirection(subtag, "rtl" | "ltr")` from their bootstrap.
 */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  "ar",  // Arabic
  "fa",  // Persian
  "he",  // Hebrew
  "ur",  // Urdu
  "yi",  // Yiddish
  "ps",  // Pashto
  "dv",  // Divehi
  "sd",  // Sindhi
  "ckb"  // Central Kurdish (Sorani)
]);
