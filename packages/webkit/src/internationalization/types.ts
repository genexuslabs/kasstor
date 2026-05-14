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
 * Loader for a feature's translations.
 *
 * Keys are full `KasstorLanguageTag`s — bare base subtags (`"es"`) act as
 * the default for every region variant of that base, and explicit
 * region-tagged entries (`"es-ES"`) override the base for that specific
 * variant. At lookup time, kasstor resolves a tag to its loader entry by
 * trying the full tag first and falling back to the base subtag.
 *
 * Typical shape: provide one entry per supported base subtag and add
 * regional entries only when the regional copy differs from the base.
 *
 * @example
 *   { en: () => import("./en"),
 *     es: () => import("./es"),
 *     "es-ES": () => import("./es-ES") }  // Iberian override
 */
export type KasstorTranslationsLoader<T extends KasstorTranslationShape> = Partial<
  Record<KasstorLanguageTag, () => Promise<T>>
>;

export type KasstorRegisterTranslationsOptions = {
  /**
   * When `true`, translations for this feature are downloaded immediately
   * when a language is set, regardless of whether any component has subscribed.
   * Defaults to `false` (lazy: only load when at least one subscriber exists).
   */
  preloadTranslations?: boolean;
};
