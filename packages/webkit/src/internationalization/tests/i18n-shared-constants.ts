/**
 * Shared constants for i18n shared-test files. Used by all-supported-languages,
 * language-mapping, and is-valid-language to avoid duplication.
 */

import type { KasstorLanguage, KasstorLanguageSubtag } from "../types.js";

export const SUPPORTED_SUBTAGS: KasstorLanguageSubtag[] = [
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "pt",
  "zh"
];

export const FULLNAME_TO_SUBTAG: Record<KasstorLanguage, KasstorLanguageSubtag> = {
  arabic: "ar",
  chinese: "zh",
  english: "en",
  french: "fr",
  german: "de",
  italian: "it",
  japanese: "ja",
  portuguese: "pt",
  spanish: "es"
};
