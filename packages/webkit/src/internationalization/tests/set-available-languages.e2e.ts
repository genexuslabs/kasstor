/**
 * E2E tests for `setAvailableLanguages`. Require browser environment
 * (window, document, localStorage, history, navigator).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getCurrentLanguage,
  getCurrentTranslations,
  languageHasBeenInitialized,
  registerTranslations,
  setAvailableLanguages,
  setInitialApplicationLanguage,
  setLanguage
} from "../index.js";
import type { KasstorLanguage } from "../types.js";
import type { AppMainShape } from "./i18n-e2e-helpers.js";
import { createEnEsLoader, FEATURE_MAIN, resetI18nState, setPathname } from "./i18n-e2e-helpers.js";

const mockNavigatorLanguages = (langs: string[]) => {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(langs);
};

const flushMicrotasks = () => new Promise(r => setTimeout(r, 0));

describe("[i18n e2e] setAvailableLanguages", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    resetI18nState();
    vi.restoreAllMocks();
    warnSpy.mockRestore?.();
  });

  describe("[validation]", () => {
    test("throws when neither availableLanguages nor defaultLanguage is provided", () => {
      expect(() => setAvailableLanguages({})).toThrow(/at least one/i);
    });

    test("empty availableLanguages is coerced to ['en'] with warn", () => {
      setAvailableLanguages({ availableLanguages: [] });
      expect(kasstorWebkitI18n!.availableLanguages).toEqual(new Set(["en"]));
      expect(warnSpy).toHaveBeenCalled();
    });

    test("availableLanguages without 'en' has 'en' added with warn", () => {
      setAvailableLanguages({ availableLanguages: ["es", "fr"] });
      expect(kasstorWebkitI18n!.availableLanguages).toEqual(new Set(["es", "fr", "en"]));
      expect(warnSpy).toHaveBeenCalled();
    });

    test("defaultLanguage outside availableLanguages is coerced to 'en' with warn", () => {
      setAvailableLanguages({
        availableLanguages: ["en", "es"],
        defaultLanguage: "fr"
      });
      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("en");
      expect(warnSpy).toHaveBeenCalled();
    });

    test("normalizes full names to subtags in availableLanguages", () => {
      setAvailableLanguages({ availableLanguages: ["spanish", "english"] });
      expect(kasstorWebkitI18n!.availableLanguages).toEqual(new Set(["es", "en"]));
    });

    test("normalizes defaultLanguage full name to subtag", () => {
      setAvailableLanguages({
        availableLanguages: ["en", "es"],
        defaultLanguage: "spanish"
      });
      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("es");
    });
  });

  describe("[no current language yet]", () => {
    test("storing config before setInitialApplicationLanguage works and is consumed by init", async () => {
      mockNavigatorLanguages(["fr-FR"]);
      setPathname("/fr/home");

      // Configure first.
      setAvailableLanguages({ availableLanguages: ["en", "es"], defaultLanguage: "es" });

      // Init now should ignore "fr" from URL and from navigator, falling
      // back to the configured default ("es").
      const result = setInitialApplicationLanguage({
        locationChangeCallback: () => {},
        pathname: "/fr/home"
      });

      expect(result.initialLanguage.subtag).toBe("es");
    });
  });

  describe("[current language already set]", () => {
    const initWithEn = () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
    };

    test("no-op when currentLanguage stays in the new list", async () => {
      initWithEn();
      await languageHasBeenInitialized();

      const langChange = vi.fn();
      kasstorWebkitI18n!.languageChangeCallback = langChange;
      const locChange = vi.fn();
      kasstorWebkitI18n!.locationChangeCallback = locChange;

      setAvailableLanguages({ availableLanguages: ["en", "es"] });
      await flushMicrotasks();

      expect(getCurrentLanguage()?.subtag).toBe("en");
      expect(langChange).not.toHaveBeenCalled();
      expect(locChange).not.toHaveBeenCalled();
    });

    test("falls back to a navigator-preferred language when current is no longer available", async () => {
      mockNavigatorLanguages(["fr-FR", "es-ES"]);
      setPathname("/fr/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();
      expect(getCurrentLanguage()?.subtag).toBe("fr");

      // Narrow the available list — "fr" is gone, navigator.languages still
      // proposes "es" (matching).
      setAvailableLanguages({ availableLanguages: ["en", "es"] });
      await flushMicrotasks();

      expect(getCurrentLanguage()?.subtag).toBe("es");
    });

    test("falls back to defaultLanguage when neither current nor navigator match", async () => {
      mockNavigatorLanguages(["fr-FR", "ja-JP"]);
      setPathname("/fr/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();

      setAvailableLanguages({
        availableLanguages: ["en", "es"],
        defaultLanguage: "es"
      });
      await flushMicrotasks();

      expect(getCurrentLanguage()?.subtag).toBe("es");
    });

    test("falls back to 'en' when no default is configured and navigator does not match", async () => {
      mockNavigatorLanguages(["ja-JP"]);
      setPathname("/fr/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();

      setAvailableLanguages({ availableLanguages: ["en", "es"] });
      await flushMicrotasks();

      expect(getCurrentLanguage()?.subtag).toBe("en");
    });

    test("invokes locationChangeCallback when the language switches", async () => {
      mockNavigatorLanguages(["fr-FR"]);
      setPathname("/fr/home");
      const locationChangeCallback = vi.fn();
      setInitialApplicationLanguage({ locationChangeCallback });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();
      locationChangeCallback.mockClear();

      setAvailableLanguages({ availableLanguages: ["en"], defaultLanguage: "en" });
      await flushMicrotasks();

      expect(locationChangeCallback).toHaveBeenCalledWith(expect.stringMatching(/^\/en\//));
    });
  });

  describe("[partial updates]", () => {
    test("only defaultLanguage updates the resolveDefaultLanguage chain", async () => {
      mockNavigatorLanguages(["ja-JP"]);
      setPathname("/en/home");
      setInitialApplicationLanguage({
        availableLanguages: ["en", "es", "fr"],
        locationChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();
      expect(getCurrentLanguage()?.subtag).toBe("en");

      // Updating only the default — does NOT change current language.
      setAvailableLanguages({ defaultLanguage: "fr" });
      await flushMicrotasks();
      expect(getCurrentLanguage()?.subtag).toBe("en");
      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("fr");
    });

    test("updating availableLanguages without defaultLanguage coerces stale default to 'en'", async () => {
      mockNavigatorLanguages(["ja-JP"]);
      setPathname("/en/home");
      setInitialApplicationLanguage({
        availableLanguages: ["en", "es", "fr"],
        defaultLanguage: "fr",
        locationChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();
      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("fr");

      setAvailableLanguages({ availableLanguages: ["en", "es"] });
      await flushMicrotasks();

      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("en");
    });
  });

  describe("[edge cases]", () => {
    test("registerTranslations for languages outside availableLanguages still works for the current language", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        locationChangeCallback: () => {}
      });
      // Loader includes Japanese, French, etc., even though only en/es are
      // exposed. Registration must remain unrestricted.
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();

      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
      // Forcing setLanguage to "fr" works (not gated by availableLanguages).
      setLanguage("fr");
      await flushMicrotasks();
      expect(getCurrentLanguage()?.subtag).toBe("fr");
    });

    test("setLanguage with a language outside availableLanguages is honored (not gated)", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        locationChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();

      setLanguage("fr", true);
      await flushMicrotasks();

      expect(getCurrentLanguage()?.subtag).toBe("fr");
      expect(document.documentElement.getAttribute("lang")).toBe("fr");
    });

    test("burst: setLanguage('fr') then setAvailableLanguages excluding 'fr' resolves to the latest available language", async () => {
      mockNavigatorLanguages(["es-ES"]);
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      // Use a delayed loader for "fr" so we can interleave the runtime change.
      const delayedLoader: Record<KasstorLanguage, () => Promise<{ greet: string }>> = {
        arabic: () => Promise.resolve({ greet: "ar" }),
        chinese: () => Promise.resolve({ greet: "zh" }),
        english: () => Promise.resolve({ greet: "Hello" }),
        french: () => new Promise(r => setTimeout(() => r({ greet: "Bonjour" }), 30)),
        german: () => Promise.resolve({ greet: "de" }),
        italian: () => Promise.resolve({ greet: "it" }),
        japanese: () => Promise.resolve({ greet: "ja" }),
        portuguese: () => Promise.resolve({ greet: "pt" }),
        spanish: () => Promise.resolve({ greet: "Hola" })
      };
      registerTranslations(FEATURE_MAIN, delayedLoader, { preloadTranslations: true });
      await languageHasBeenInitialized();

      setLanguage("fr"); // in flight
      setAvailableLanguages({ availableLanguages: ["en", "es"] });
      // Wait long enough for the delayed "fr" loader to settle.
      await new Promise(r => setTimeout(r, 60));

      // The end state must be "es" (resolved via navigator), and translations
      // must reflect "es", not "fr".
      expect(getCurrentLanguage()?.subtag).toBe("es");
      expect(getCurrentTranslations<{ greet: string }>(FEATURE_MAIN)!.greet).toBe("Hola");
    });
  });
});
