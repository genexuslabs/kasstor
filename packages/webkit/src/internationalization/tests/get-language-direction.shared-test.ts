import { describe, expect, test } from "vitest";
import { getLanguageDirection } from "../get-language-direction.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

const RTL_SUBTAG = "ar";
const LTR_SUBTAGS = SUPPORTED_SUBTAGS.filter(s => s !== RTL_SUBTAG);

describe("[getLanguageDirection]", () => {
  test("returns rtl for Arabic (ar)", () => {
    expect(getLanguageDirection(RTL_SUBTAG)).toBe("rtl");
  });

  test.each(LTR_SUBTAGS)(
    "returns ltr for %s",
    subtag => {
      expect(getLanguageDirection(subtag)).toBe("ltr");
    }
  );
});
