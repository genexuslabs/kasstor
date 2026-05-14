import { afterEach, describe, expect, test } from "vitest";
import {
  getLanguageDirection,
  registerLanguageDirection
} from "../get-language-direction.js";
import { RTL_LANGUAGES } from "../rtl-languages.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

const LTR_SUBTAGS = SUPPORTED_SUBTAGS.filter(s => !RTL_LANGUAGES.has(s));

describe("[getLanguageDirection]", () => {
  // The `overrides` Map is module-level state — reset any subtag a test
  // may have written to keep tests independent.
  const overriddenSubtags = new Set<string>();
  const trackOverride = (subtag: string, dir: "ltr" | "rtl") => {
    overriddenSubtags.add(subtag);
    registerLanguageDirection(subtag, dir);
  };

  afterEach(() => {
    for (const subtag of overriddenSubtags) {
      // Restore the curated default by writing the value that matches
      // `RTL_LANGUAGES` membership.
      registerLanguageDirection(
        subtag,
        RTL_LANGUAGES.has(subtag) ? "rtl" : "ltr"
      );
    }
    overriddenSubtags.clear();
  });

  describe("curated RTL_LANGUAGES set", () => {
    test.each(Array.from(RTL_LANGUAGES))("returns 'rtl' for %s", subtag => {
      expect(getLanguageDirection(subtag)).toBe("rtl");
    });

    test.each(LTR_SUBTAGS)("returns 'ltr' for %s", subtag => {
      expect(getLanguageDirection(subtag)).toBe("ltr");
    });
  });

  describe("direction is shared across region variants", () => {
    test("'ar-SA' resolves to rtl (same base as 'ar')", () => {
      expect(getLanguageDirection("ar-SA")).toBe("rtl");
    });

    test("'en-US' resolves to ltr (same base as 'en')", () => {
      expect(getLanguageDirection("en-US")).toBe("ltr");
    });

    test("'es-AR' resolves to ltr regardless of region", () => {
      expect(getLanguageDirection("es-AR")).toBe("ltr");
    });
  });

  describe("arbitrary base subtags (open-universe)", () => {
    test("unknown base subtag falls back to 'ltr'", () => {
      // `"nl"` is not in `RTL_LANGUAGES`, no override registered.
      expect(getLanguageDirection("nl")).toBe("ltr");
      expect(getLanguageDirection("nl-NL")).toBe("ltr");
    });

    test("returns 'ltr' for the special 'fil' 3-letter base subtag", () => {
      expect(getLanguageDirection("fil")).toBe("ltr");
    });
  });

  describe("registerLanguageDirection overrides", () => {
    test("override forces 'rtl' for an otherwise-LTR subtag", () => {
      expect(getLanguageDirection("nl")).toBe("ltr");
      trackOverride("nl", "rtl");
      expect(getLanguageDirection("nl")).toBe("rtl");
    });

    test("override forces 'ltr' for an otherwise-RTL subtag", () => {
      expect(getLanguageDirection("ar")).toBe("rtl");
      trackOverride("ar", "ltr");
      expect(getLanguageDirection("ar")).toBe("ltr");
    });

    test("override applies to all region variants of the base", () => {
      trackOverride("nl", "rtl");
      expect(getLanguageDirection("nl-NL")).toBe("rtl");
      expect(getLanguageDirection("nl-BE")).toBe("rtl");
    });

    test("re-registering the same subtag replaces the previous value", () => {
      trackOverride("nl", "rtl");
      expect(getLanguageDirection("nl")).toBe("rtl");
      trackOverride("nl", "ltr");
      expect(getLanguageDirection("nl")).toBe("ltr");
    });

    test("the subtag key passed to register is lowercased", () => {
      // `registerLanguageDirection` lowercases the key so callers can
      // pass any casing without producing ghost entries in the Map.
      // The lookup path expects already-canonical tags (callers go
      // through `normalizeTag` first), so we test the canonical query.
      trackOverride("NL", "rtl");
      expect(getLanguageDirection("nl")).toBe("rtl");
    });
  });
});
