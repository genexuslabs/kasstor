import { describe, expect, test } from "vitest";
import { isValidLanguage } from "../is-valid-language.js";
import type { KasstorLanguageTag } from "../types.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[isValidLanguage]", () => {
  describe("well-known base subtags", () => {
    test.each(SUPPORTED_SUBTAGS)(
      "returns true for %s",
      subtag => {
        expect(isValidLanguage(subtag)).toBe(true);
      }
    );
  });

  describe("arbitrary BCP47 base subtags (structural validation)", () => {
    // The library is open-universe: any string that matches the BCP47
    // base shape (2–3 ASCII letters) is structurally valid, regardless
    // of whether it is a real language code. Membership in the host's
    // `availableLanguages` is a separate concern (`isLanguageAvailable`).
    test("accepts a 2-letter base not in the curated set ('nl')", () => {
      expect(isValidLanguage("nl")).toBe(true);
    });

    test("accepts a 3-letter base ('fil', 'haw')", () => {
      expect(isValidLanguage("fil")).toBe(true);
      expect(isValidLanguage("haw")).toBe(true);
    });

    test("accepts tags with region ('es-AR', 'nl-NL', 'zh-Hans')", () => {
      expect(isValidLanguage("es-AR")).toBe(true);
      expect(isValidLanguage("nl-NL")).toBe(true);
      expect(isValidLanguage("zh-Hans")).toBe(true);
    });

    test("normalizes casing on the base", () => {
      expect(isValidLanguage("EN")).toBe(true);
      expect(isValidLanguage("en-us")).toBe(true);
    });
  });

  describe("structurally invalid inputs", () => {
    const invalidInputs: { value: string | null; description: string }[] = [
      { value: null, description: "null" },
      { value: "", description: "empty string" },
      { value: "e", description: "single character" },
      { value: "engl", description: "four-letter base" },
      { value: "123", description: "non-alphabetic base" },
      { value: "1en", description: "digit-prefixed base" }
    ];

    test.each(invalidInputs)("returns false for $description", ({ value }) => {
      expect(isValidLanguage(value)).toBe(false);
    });
  });

  test("narrows the type when true", () => {
    const value: string | null = "en";
    if (isValidLanguage(value)) {
      const narrowed: KasstorLanguageTag = value;
      expect(narrowed).toBe("en");
    }
  });
});
