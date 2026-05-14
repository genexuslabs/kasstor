/**
 * Curated set of BCP47 base subtags that the library ships with for
 * autocomplete and as documentation defaults. The runtime accepts any
 * structurally valid base subtag — the host application declares its
 * supported universe via `setInitialApplicationLanguage`.
 */
export type KnownKasstorLanguageSubtag =
  | "ar"
  | "de"
  | "en"
  | "es"
  | "fr"
  | "it"
  | "ja"
  | "pt"
  | "zh";

/**
 * BCP47 base subtag. Open by design — applications declare their supported
 * universe at bootstrap time (via `setInitialApplicationLanguage`) rather
 * than the library hardcoding it. The `(string & {})` keeps autocomplete
 * for `KnownKasstorLanguageSubtag` literals while allowing any other
 * string (e.g. `"nl"`, `"he"`, `"pl"`).
 */
export type KasstorLanguageSubtag =
  | KnownKasstorLanguageSubtag
  | (string & {});

/**
 * BCP47 tag with a region subtag (e.g. `"en-US"`, `"es-AR"`). The region
 * is opaque at the type level; runtime canonicalization (`normalizeTag`)
 * lowercases the base and uppercases the region.
 */
export type KasstorLanguageSubtagWithRegion = `${KasstorLanguageSubtag}-${string}`;

/**
 * Canonical language identifier used across the kasstor i18n API: either
 * a bare base subtag or a base subtag with an optional region.
 */
export type KasstorLanguageTag =
  | KasstorLanguageSubtag
  | KasstorLanguageSubtagWithRegion;

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
