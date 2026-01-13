import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import type { KasstorLanguageSubtag } from "./types";

export const isValidLanguage = (
  language: string | null
): language is KasstorLanguageSubtag =>
  language !== null &&
  ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(language as KasstorLanguageSubtag);

