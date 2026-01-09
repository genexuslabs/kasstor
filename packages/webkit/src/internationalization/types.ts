export type KasstorLanguage =
  | "english"
  | "spanish"
  | "japanese"
  | "french"
  | "german"
  | "portuguese"
  | "italian"
  | "chinese"
  | "arabic";

/**
 * BCP 47 language tags for supported languages.
 * See: https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag#bcp_47_syntax
 */
export type KasstorLanguageSubtag =
  | "en"
  | "ja"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "it"
  | "zh"
  | "ar";

/**
 * BCP 47 language tags for supported languages.
 * See: https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag#region_subtag_optional
 */
export type KasstorLanguageSubtagWithRegion =
  | "en-US"
  | "ja"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "pt-BR"
  | "it-IT"
  | "zh-CN"
  | "ar-SA";

export type KasstorLanguageFullnameAndSubtag = {
  fullLanguageName: KasstorLanguage;
  subtag: KasstorLanguageSubtag;
};

export type KasstorTranslationShape = Record<string | number, unknown>;

export type KasstorTranslations<T extends KasstorTranslationShape> = Map<
  KasstorLanguage,
  T
>;

export type KasstorTranslationsLoader<T extends KasstorTranslationShape> =
  Record<KasstorLanguage, () => Promise<T>>;

