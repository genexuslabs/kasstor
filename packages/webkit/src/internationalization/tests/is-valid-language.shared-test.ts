import { describe, expect, test } from "vitest";
import { isValidLanguage } from "../is-valid-language.js";
import type { KasstorLanguageTag } from "../types.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[isValidLanguage]", () => {
  test.each(SUPPORTED_SUBTAGS)(
    "returns true for supported subtag %s",
    subtag => {
      expect(isValidLanguage(subtag)).toBe(true);
    }
  );

  const invalidInputs: { value: string | null; description: string }[] = [
    { value: null, description: "null" },
    { value: "", description: "empty string" },
    { value: "xx", description: "unsupported code" },
    { value: "e", description: "single character" },
    { value: "eng", description: "three characters" },
    { value: "EN", description: "uppercase" }
  ];

  test.each(invalidInputs)(
    "returns false for $description",
    ({ value }) => {
      expect(isValidLanguage(value)).toBe(false);
    }
  );

  test("narrows type when true", () => {
    const value: string | null = "en";
    if (isValidLanguage(value)) {
      const _: KasstorLanguageTag = value;
      expect(_).toBe("en");
    }
  });
});
