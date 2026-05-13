import type { KasstorLanguageSubtag, KasstorLanguageTag } from "./types";

/**
 * Returns the base subtag of a language tag (`"es-AR"` → `"es"`, `"en"` → `"en"`).
 *
 * Used internally to resolve translation loaders, document direction and
 * cache lookups: those are keyed by base subtag (a region variant uses the
 * same translation file as its base).
 */
export const getBaseSubtag = (tag: KasstorLanguageTag): KasstorLanguageSubtag => {
  const dashIndex = tag.indexOf("-");
  return (dashIndex === -1 ? tag : tag.slice(0, dashIndex)) as KasstorLanguageSubtag;
};
