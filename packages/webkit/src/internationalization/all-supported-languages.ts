import type { KasstorLanguageSubtag } from "./types";

/**
 * Set of all supported BCP 47 language subtags (e.g. `"en"`, `"es"`).
 * Use to check if a string is a supported language before calling
 * `fromLanguageToFullnameAndSubtag` or `setLanguage`.
 */
export const ALL_SUPPORTED_LANGUAGE_SUBTAGS = new Set([
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "pt",
  "zh"
] satisfies KasstorLanguageSubtag[]);
