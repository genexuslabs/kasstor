import { describe, expect, test } from "vitest";
import { getLanguageDirection } from "../get-language-direction.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[getLanguageDirection]", () => {
  test("returns rtl for ar", () => {
    expect(getLanguageDirection("ar")).toBe("rtl");
  });

  test("returns ltr for all other supported subtags", () => {
    const ltr = SUPPORTED_SUBTAGS.filter(s => s !== "ar");
    ltr.forEach(subtag => expect(getLanguageDirection(subtag)).toBe("ltr"));
  });
});
