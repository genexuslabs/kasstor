import { describe, expect, test } from "vitest";
import { ALL_SUPPORTED_LANGUAGE_SUBTAGS } from "../index.js";
import type { KasstorLanguageSubtag } from "../types.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

const INVALID_CODES: (string | KasstorLanguageSubtag)[] = [
  "en-US",
  "xx",
  ""
];

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

  test.each(SUPPORTED_SUBTAGS)(
    "contains supported subtag %s",
    subtag => {
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(subtag)).toBe(true);
    }
  );

  test.each(INVALID_CODES)(
    "does not contain invalid code %s",
    code => {
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has(code as KasstorLanguageSubtag)).toBe(false);
    }
  );
});
