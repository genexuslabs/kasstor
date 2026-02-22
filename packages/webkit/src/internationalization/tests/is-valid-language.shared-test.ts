import { describe, expect, test } from "vitest";
import { isValidLanguage } from "../is-valid-language.js";
import type { KasstorLanguageSubtag } from "../types.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[isValidLanguage]", () => {
  SUPPORTED_SUBTAGS.forEach(subtag => {
    test(`returns true for supported subtag "${subtag}"`, () => {
      expect(isValidLanguage(subtag)).toBe(true);
    });
  });

  test("returns false for null", () => {
    expect(isValidLanguage(null)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isValidLanguage("")).toBe(false);
  });

  test("returns false for unsupported code xx", () => {
    expect(isValidLanguage("xx")).toBe(false);
  });

  test("returns false for region-specific code en-US", () => {
    expect(isValidLanguage("en-US")).toBe(false);
  });

  test("narrows type when true", () => {
    const value: string | null = "en";
    if (isValidLanguage(value)) {
      const _: KasstorLanguageSubtag = value;
      expect(_).toBe("en");
    }
  });
});
