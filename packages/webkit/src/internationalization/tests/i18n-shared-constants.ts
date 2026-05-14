/**
 * Shared constants for i18n shared-test files. Centralizes the curated
 * subtag list so tests stay in sync with `KnownKasstorLanguageSubtag` in
 * types.ts.
 */

import type { KnownKasstorLanguageSubtag } from "../types.js";

export const SUPPORTED_SUBTAGS: KnownKasstorLanguageSubtag[] = [
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "pt",
  "zh"
];
