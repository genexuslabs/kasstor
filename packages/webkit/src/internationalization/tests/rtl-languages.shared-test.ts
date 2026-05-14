import { describe, expect, test } from "vitest";
import { RTL_LANGUAGES } from "../rtl-languages.js";

describe("[RTL_LANGUAGES]", () => {
  test("is a Set", () => {
    expect(RTL_LANGUAGES).toBeInstanceOf(Set);
  });

  test("contains the common right-to-left scripts", () => {
    // Sanity floor: Arabic, Hebrew, Persian, Urdu. The full curated list
    // is broader (see source), but these are the must-haves.
    expect(RTL_LANGUAGES.has("ar")).toBe(true);
    expect(RTL_LANGUAGES.has("he")).toBe(true);
    expect(RTL_LANGUAGES.has("fa")).toBe(true);
    expect(RTL_LANGUAGES.has("ur")).toBe(true);
  });

  test("only stores base subtags (no region or script in any entry)", () => {
    // Direction is a property of the base subtag — keeping the set
    // free of regions cuts both bytes and lookup cost (one O(1) probe
    // against `getBaseSubtag(tag)` is all callers ever need).
    for (const subtag of RTL_LANGUAGES) {
      expect(subtag).not.toContain("-");
    }
  });

  test("does not contain any well-known LTR subtag", () => {
    for (const subtag of ["en", "es", "fr", "de", "it", "ja", "pt", "zh"]) {
      expect(RTL_LANGUAGES.has(subtag)).toBe(false);
    }
  });
});
