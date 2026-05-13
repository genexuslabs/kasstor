import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "./all-supported-languages.js";
import { getBaseSubtag } from "./get-base-subtag.js";
import type { KasstorLanguageSubtag, KasstorLanguageTag } from "./types";

/**
 * Returns whether `tag` is a non-empty string whose base subtag is supported.
 *
 * Accepts both bare subtags (`"en"`) and tags-with-region (`"en-US"`). The
 * region content is opaque — only the base is validated against the supported
 * set.
 */
export const isValidLanguage = (
  tag: string | null
): tag is KasstorLanguageTag => {
  if (tag === null || typeof tag !== "string" || tag.length === 0) {
    return false;
  }

  // Reject trailing dash (e.g. "en-")
  const dashIndex = tag.indexOf("-");
  if (dashIndex !== -1 && dashIndex === tag.length - 1) {
    return false;
  }

  return ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(
    getBaseSubtag(tag as KasstorLanguageTag) as KasstorLanguageSubtag
  );
};
