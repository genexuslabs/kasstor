import type { KasstorLanguage, KasstorLanguageSubtag } from "./types";

const languageToLanguageSubtagDictionary = {
  arabic: "ar",
  german: "de",
  english: "en",
  spanish: "es",
  french: "fr",
  italian: "it",
  japanese: "ja",
  portuguese: "pt",
  chinese: "zh"
} as const satisfies Record<KasstorLanguage, KasstorLanguageSubtag>;

/**
 * Maps a full language name to its BCP 47 subtag.
 *
 * @param language - Full name (e.g. `"english"`, `"spanish"`).
 * @returns The subtag (e.g. `"en"`, `"es"`).
 */
export const fromLanguageFullnameToSubtag = <T extends KasstorLanguage>(
  language: T
): KasstorLanguageSubtag => languageToLanguageSubtagDictionary[language];
