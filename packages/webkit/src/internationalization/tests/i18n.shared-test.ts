import { describe, expect, test } from "vitest";
import {
  ALL_SUPPORTED_LANGUAGE_SUBTAGS,
  fromLanguageFullnameToSubtag,
  fromLanguageToFullnameAndSubtag,
  getClientLanguage,
  getCurrentLanguage,
  getCurrentTranslations,
  getLanguageFromUrl,
  setInitialApplicationLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "../index.js";
import { getLanguageDirection } from "../get-language-direction.js";
import { isValidLanguage } from "../is-valid-language.js";
import type { KasstorLanguage, KasstorLanguageSubtag } from "../types.js";

const SUPPORTED_SUBTAGS: KasstorLanguageSubtag[] = [
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "pt",
  "zh"
];

const FULLNAME_TO_SUBTAG: Record<KasstorLanguage, KasstorLanguageSubtag> = {
  arabic: "ar",
  chinese: "zh",
  english: "en",
  french: "fr",
  german: "de",
  italian: "it",
  japanese: "ja",
  portuguese: "pt",
  spanish: "es"
};

describe("[i18n]", () => {
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

    test("does not contain invalid codes", () => {
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("en-US" as KasstorLanguageSubtag)).toBe(false);
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("xx" as KasstorLanguageSubtag)).toBe(false);
      expect(ALL_SUPPORTED_LANGUAGE_SUBTAGS.has("" as KasstorLanguageSubtag)).toBe(false);
    });
  });

  describe("[fromLanguageFullnameToSubtag]", () => {
    (Object.keys(FULLNAME_TO_SUBTAG) as KasstorLanguage[]).forEach(fullName => {
      test(`maps "${fullName}" to "${FULLNAME_TO_SUBTAG[fullName]}"`, () => {
        expect(fromLanguageFullnameToSubtag(fullName)).toBe(FULLNAME_TO_SUBTAG[fullName]);
      });
    });

    test("returns undefined for a string not in the dictionary", () => {
      // Runtime behavior: dictionary lookup for unknown key returns undefined
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

  describe("[getLanguageFromUrl]", () => {
    test("extracts es from /es/home", () => {
      expect(getLanguageFromUrl("/es/home")).toBe("es");
    });

    test("extracts en from /en", () => {
      expect(getLanguageFromUrl("/en")).toBe("en");
    });

    test("extracts fr from /fr/foo/bar", () => {
      expect(getLanguageFromUrl("/fr/foo/bar")).toBe("fr");
    });

    test("returns null for path without language segment /home", () => {
      expect(getLanguageFromUrl("/home")).toBeNull();
    });

    test("returns null for /123/ab", () => {
      expect(getLanguageFromUrl("/123/ab")).toBeNull();
    });

    test("returns null for root path /", () => {
      expect(getLanguageFromUrl("/")).toBeNull();
    });

    test("returns null for empty pathname", () => {
      expect(getLanguageFromUrl("")).toBeNull();
    });

    test("extracts two-letter segment when path has single segment", () => {
      expect(getLanguageFromUrl("/ja")).toBe("ja");
    });

    test("returns null when first segment is not exactly two letters (e.g. /en-US)", () => {
      expect(getLanguageFromUrl("/en-US")).toBeNull();
    });
  });

  describe("[getLanguageDirection]", () => {
    test("returns rtl for ar", () => {
      expect(getLanguageDirection("ar")).toBe("rtl");
    });

    test("returns ltr for all other supported subtags", () => {
      const ltr = SUPPORTED_SUBTAGS.filter(s => s !== "ar");
      ltr.forEach(subtag =>
        expect(getLanguageDirection(subtag)).toBe("ltr")
      );
    });
  });

  describe("[getClientLanguage]", () => {
    test.runIf(typeof window === "undefined")(
      "returns default language when window is undefined (server)",
      () => {
        expect(getClientLanguage()).toBe("en");
      }
    );
  });

  describe("[setInitialApplicationLanguage] (server)", () => {
    test.runIf(typeof window === "undefined")(
      "throws when pathname is undefined and window is undefined (server)",
      () => {
        expect(() =>
          setInitialApplicationLanguage({
            locationChangeCallback: () => {},
            pathname: undefined
          })
        ).toThrow(
          '"setInitialApplicationLanguage" requires a pathname when called in the server'
        );
      }
    );
  });

  describe("[getCurrentLanguage] and [getCurrentTranslations] (no language set)", () => {
    test("getCurrentLanguage returns undefined when no language has been set", () => {
      expect(getCurrentLanguage()).toBeUndefined();
    });

    test("getCurrentTranslations returns undefined for any featureId when no language set", () => {
      expect(getCurrentTranslations("feature-x")).toBeUndefined();
    });
  });

  describe("[subscribeToLanguageChanges] and [unsubscribeToLanguageChanges]", () => {
    test("subscribe returns a unique string id with expected prefix", () => {
      const id = subscribeToLanguageChanges("feature-a", () => {});
      expect(typeof id).toBe("string");
      expect(id.startsWith("kasstor-webkit-i18n-subscriber-")).toBe(true);
      unsubscribeToLanguageChanges(id);
    });

    test("unsubscribe returns true when subscription existed", () => {
      const id = subscribeToLanguageChanges("feature-a", () => {});
      const removed = unsubscribeToLanguageChanges(id);
      expect(removed).toBe(true);
    });

    test("unsubscribe returns false when subscription did not exist", () => {
      const removed = unsubscribeToLanguageChanges("nonexistent-id");
      expect(removed).toBe(false);
    });

    test("unsubscribe same id twice: first true, second false", () => {
      const id = subscribeToLanguageChanges("feature-a", () => {});
      expect(unsubscribeToLanguageChanges(id)).toBe(true);
      expect(unsubscribeToLanguageChanges(id)).toBe(false);
    });

    test("multiple subscriptions return distinct ids", () => {
      const id1 = subscribeToLanguageChanges("feature-a", () => {});
      const id2 = subscribeToLanguageChanges("feature-a", () => {});
      const id3 = subscribeToLanguageChanges("feature-b", () => {});
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
      unsubscribeToLanguageChanges(id1);
      unsubscribeToLanguageChanges(id2);
      unsubscribeToLanguageChanges(id3);
    });
  });
});
