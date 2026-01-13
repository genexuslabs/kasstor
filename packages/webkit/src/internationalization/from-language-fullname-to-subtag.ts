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

export const fromLanguageFullnameToSubtag = <T extends KasstorLanguage>(
  language: T
) => languageToLanguageSubtagDictionary[language];

