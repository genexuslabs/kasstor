/**
 * E2E tests for setLanguage and languageHasBeenInitialized. Require browser
 * environment (window, document, localStorage, history).
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getCurrentLanguage,
  getCurrentTranslations,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage
} from "../index.js";
import type { KasstorLanguageSubtag } from "../types.js";
import type { AppMainShape } from "./i18n-e2e-helpers.js";
import { createEnEsLoader, FEATURE_MAIN, resetI18nState, setPathname } from "./i18n-e2e-helpers.js";

describe("[i18n e2e] setLanguage", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[setLanguage]", () => {
    test("accepts subtag and full name", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });

      setLanguage("es");
      await languageHasBeenInitialized();
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");

      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
    });

    test("with executeLocationChange true updates document lang and dir and calls locationChangeCallback", async () => {
      setPathname("/en/dashboard");
      const locationChangeCallback = vi.fn();
      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });

      const newPath = setLanguage("es", true);

      expect(document.documentElement.getAttribute("lang")).toBe("es");
      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      expect(locationChangeCallback).toHaveBeenCalledWith(expect.stringMatching(/^\/es\//));
      expect(newPath).toBeDefined();
    });

    test("with executeLocationChange false does not call locationChangeCallback for URL update", async () => {
      setPathname("/en/dashboard");
      const locationChangeCallback = vi.fn();
      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });

      setLanguage("es", false);

      expect(locationChangeCallback).not.toHaveBeenCalled();
    });

    test("returns new location when language changed even if executeLocationChange is false", () => {
      setPathname("/en/dashboard");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const result = setLanguage("es", false);

      expect(result).toBe("/es/dashboard");
    });

    test("only notifies subscribers for the latest language when switching rapidly", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const delays: Record<string, number> = {
        en: 30,
        es: 10
      };
      const raceLoader: Record<KasstorLanguageSubtag, () => Promise<AppMainShape>> = {
        ar: () => Promise.resolve({ greet: "ar", footer: "" }),
        zh: () => Promise.resolve({ greet: "zh", footer: "" }),
        en: () =>
          new Promise(r => setTimeout(() => r({ greet: "Hello", footer: "" }), delays.en)),
        fr: () => Promise.resolve({ greet: "fr", footer: "" }),
        de: () => Promise.resolve({ greet: "de", footer: "" }),
        it: () => Promise.resolve({ greet: "it", footer: "" }),
        ja: () => Promise.resolve({ greet: "ja", footer: "" }),
        pt: () => Promise.resolve({ greet: "pt", footer: "" }),
        es: () =>
          new Promise(r => setTimeout(() => r({ greet: "Hola", footer: "" }), delays.es))
      };
      registerTranslations(FEATURE_MAIN, raceLoader, { preloadTranslations: true });

      setLanguage("en");
      setLanguage("es");
      await new Promise(r => setTimeout(r, 50));

      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations!.greet).toBe("Hola");
    });
  });

  describe("[languageHasBeenInitialized]", () => {
    test("resolves after first setLanguage and translations are loaded", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });

      const initPromise = languageHasBeenInitialized();
      setLanguage("en");

      await initPromise;
      expect(getCurrentLanguage()).toBeDefined();
    });

    test("same Promise is returned on multiple calls", () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const p1 = languageHasBeenInitialized();
      const p2 = languageHasBeenInitialized();

      expect(p1).toBe(p2);
    });
  });
});

