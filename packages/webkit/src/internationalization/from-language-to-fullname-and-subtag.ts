import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { fromLanguageFullnameToSubtag } from "./from-language-fullname-to-subtag.js";
import type {
  KasstorLanguage,
  KasstorLanguageFullnameAndSubtag,
  KasstorLanguageSubtag
} from "./types";

const languageSubtagToLanguageDictionary = {
  ar: "arabic",
  de: "german",
  en: "english",
  es: "spanish",
  fr: "french",
  it: "italian",
  ja: "japanese",
  pt: "portuguese",
  zh: "chinese"
} as const satisfies Record<KasstorLanguageSubtag, KasstorLanguage>;

const isSubtagLanguage = (
  language: KasstorLanguage | KasstorLanguageSubtag
): language is KasstorLanguageSubtag =>
  ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(language as KasstorLanguageSubtag);

export const fromLanguageToFullnameAndSubtag = <
  T extends KasstorLanguage | KasstorLanguageSubtag
>(
  language: T
): KasstorLanguageFullnameAndSubtag =>
  isSubtagLanguage(language)
    ? {
        fullLanguageName: languageSubtagToLanguageDictionary[language],
        subtag: language
      }
    : {
        fullLanguageName: language,
        subtag: fromLanguageFullnameToSubtag(language satisfies KasstorLanguage)
      };

