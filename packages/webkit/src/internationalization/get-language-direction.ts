import type { KasstorLanguageSubtag } from "./types";

const languageToDirAttrMap = {
  ar: "rtl",
  de: "ltr",
  en: "ltr",
  es: "ltr",
  fr: "ltr",
  it: "ltr",
  ja: "ltr",
  pt: "ltr",
  zh: "ltr"
} as const satisfies Record<KasstorLanguageSubtag, "ltr" | "rtl">;

export const getLanguageDirection = <T extends KasstorLanguageSubtag>(
  language: T
) => languageToDirAttrMap[language];

