import { describe, expect, test } from "vitest";
import { getCurrentLanguage, getCurrentTranslations } from "../index.js";

describe("[getCurrentLanguage] and [getCurrentTranslations] (no language set)", () => {
  test("getCurrentLanguage returns undefined when no language has been set", () => {
    expect(getCurrentLanguage()).toBeUndefined();
  });

  test("getCurrentTranslations returns undefined for any featureId when no language set", () => {
    expect(getCurrentTranslations("feature-x")).toBeUndefined();
  });
});
