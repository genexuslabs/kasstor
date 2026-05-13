/**
 * BCP 47 language subtags supported by kasstor's i18n manager.
 * See: https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag#bcp_47_syntax
 */
export type KasstorLanguageSubtag = "en" | "ja" | "es" | "fr" | "de" | "pt" | "it" | "zh" | "ar";

/**
 * BCP 47 language tag with a region subtag (e.g. `"en-US"`, `"es-AR"`).
 * The region is opaque: any non-empty string is accepted at the type level,
 * canonicalized to uppercase at runtime by `normalizeTag`.
 */
export type KasstorLanguageSubtagWithRegion = `${KasstorLanguageSubtag}-${string}`;

/**
 * Canonical language identifier: either a bare subtag (`"en"`) or a tag
 * with an optional region (`"en-US"`). This is the single representation
 * used across the kasstor i18n API.
 */
export type KasstorLanguageTag = KasstorLanguageSubtag | KasstorLanguageSubtagWithRegion;

export type KasstorTranslationShape = Record<string | number, unknown>;

/**
 * Loader for a feature's translations. Keyed by base subtag — region
 * variants share the same translation file (regions only affect
 * `<html lang>`, `localStorage`, URL segments and HTTP headers).
 */
export type KasstorTranslationsLoader<T extends KasstorTranslationShape> = Record<
  KasstorLanguageSubtag,
  () => Promise<T>
>;

export type KasstorRegisterTranslationsOptions = {
  /**
   * When `true`, translations for this feature are downloaded immediately
   * when a language is set, regardless of whether any component has subscribed.
   * Defaults to `false` (lazy: only load when at least one subscriber exists).
   */
  preloadTranslations?: boolean;
};
