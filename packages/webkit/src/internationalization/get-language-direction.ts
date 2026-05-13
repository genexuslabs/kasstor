import { getBaseSubtag } from "./get-base-subtag.js";
import type { KasstorLanguageSubtag, KasstorLanguageTag } from "./types";

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

/**
 * Returns the writing direction (`"ltr"` or `"rtl"`) for a language tag.
 * Direction is determined by the base subtag; region is ignored.
 */
export const getLanguageDirection = (tag: KasstorLanguageTag) =>
  languageToDirAttrMap[getBaseSubtag(tag)];
