import { describe, expect, test } from "vitest";
import {
  fromLanguageFullnameToSubtag,
  fromLanguageToFullnameAndSubtag
} from "../index.js";
import type { KasstorLanguage } from "../types.js";
import { FULLNAME_TO_SUBTAG, SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[fromLanguageFullnameToSubtag]", () => {
  (Object.keys(FULLNAME_TO_SUBTAG) as KasstorLanguage[]).forEach(fullName => {
    test(`maps "${fullName}" to "${FULLNAME_TO_SUBTAG[fullName]}"`, () => {
      expect(fromLanguageFullnameToSubtag(fullName)).toBe(FULLNAME_TO_SUBTAG[fullName]);
    });
  });

  test("returns undefined for a string not in the dictionary", () => {
    expect(
      (fromLanguageFullnameToSubtag as (x: string) => string)("invalid")
    ).toBeUndefined();
  });
});

describe("[fromLanguageToFullnameAndSubtag]", () => {
  SUPPORTED_SUBTAGS.forEach(subtag => {
    const fullName = Object.entries(FULLNAME_TO_SUBTAG).find(
      ([_, s]) => s === subtag
    )![0] as KasstorLanguage;

    test(`subtag "${subtag}" returns { fullLanguageName: "${fullName}", subtag: "${subtag}" }`, () => {
      const result = fromLanguageToFullnameAndSubtag(subtag);
      expect(result).toEqual({ fullLanguageName: fullName, subtag });
    });
  });

  (Object.keys(FULLNAME_TO_SUBTAG) as KasstorLanguage[]).forEach(fullName => {
    const subtag = FULLNAME_TO_SUBTAG[fullName];

    test(`full name "${fullName}" returns { fullLanguageName, subtag: "${subtag}" }`, () => {
      const result = fromLanguageToFullnameAndSubtag(fullName);
      expect(result.fullLanguageName).toBe(fullName);
      expect(result.subtag).toBe(subtag);
    });
  });

  test("unsupported string yields fullLanguageName as input and undefined subtag", () => {
    const result = (fromLanguageToFullnameAndSubtag as (x: string) => {
      fullLanguageName: string;
      subtag: string | undefined;
    })("unsupported");
    expect(result.fullLanguageName).toBe("unsupported");
    expect(result.subtag).toBeUndefined();
  });
});
