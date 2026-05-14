import { normalizeTag } from "./normalize-tag.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Returns whether `tag` is a structurally valid BCP47 language tag (2–3
 * letter base subtag with an optional region after a dash).
 *
 * This is purely structural: it does NOT consult the host's configured
 * `availableLanguages`. Use `isLanguageAvailable` to check whether a tag
 * is actually exposed to end users.
 */
export const isValidLanguage = (
  tag: string | null
): tag is KasstorLanguageTag =>
  tag !== null && normalizeTag(tag) !== undefined;
