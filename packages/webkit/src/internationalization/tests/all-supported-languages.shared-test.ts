import { describe, expect, test } from "vitest";
import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "../index.js";
import type { KasstorLanguageSubtag } from "../types.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[ALL_SUPPORTED_LANGUAGE_SUBTAGS]", () => {
  test("is a Set instance", () => {
    expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS).toBeInstanceOf(Set);
  });

  test("contains exactly the nine supported subtags", () => {
    expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.size).toBe(9);
    SUPPORTED_SUBTAGS.forEach(subtag =>
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(subtag)).toBe(true)
    );
  });

  test("does not contain invalid codes", () => {
    expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("en-US" as KasstorLanguageSubtag)).toBe(false);
    expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("xx" as KasstorLanguageSubtag)).toBe(false);
    expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("" as KasstorLanguageSubtag)).toBe(false);
  });
});
