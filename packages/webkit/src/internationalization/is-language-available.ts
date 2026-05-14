import { resolveAvailableLanguage } from "./resolve-available-language.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns whether `tag` is acceptable under the host's `availableLanguages`.
 *
 * When no list has been configured (host never called
 * `setInitialApplicationLanguage` or `setAvailableLanguages`), every tag
 * is considered available.
 *
 * Wildcard-by-base matching: a configured base subtag accepts any region
 * variant, and a configured region-tagged entry accepts a bare-subtag
 * query that shares its base. Both directions resolve in O(1) via
 * `resolveAvailableLanguage`.
 *
 * Examples (configured `availableLanguages`):
 * - `["es"]`     → `"es"`, `"es-AR"`, `"es-ES"` are all available.
 * - `["es-AR"]`  → `"es-AR"`, `"es"`, `"es-ES"` are all available.
 * - `["es-AR"]`  → `"fr"`, `"en-US"` are NOT available.
 */
export const isLanguageAvailable = (tag: KasstorLanguageTag): boolean =>
  resolveAvailableLanguage(tag) !== undefined;
