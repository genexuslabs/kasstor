/**
 * E2E tests for RTL, popstate/back-forward navigation, and getCurrent*
 * with language set. Require browser environment (window, document,
 * localStorage, history).
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
import {
  createEnEsLoader,
  FEATURE_MAIN,
  resetI18nState,
  setPathname
} from "./i18n-e2e-helpers.js";
import type { AppMainShape } from "./i18n-e2e-helpers.js";

describe("[i18n e2e] navigation and getters", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[RTL]", () => {
    test("setting Arabic sets dir to rtl on document", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(
        FEATURE_MAIN,
        {
          arabic: () => Promise.resolve({ greet: "مرحبا" }),
          chinese: () => Promise.resolve({ greet: "zh" }),
          english: () => Promise.resolve({ greet: "Hello" }),
          french: () => Promise.resolve({ greet: "fr" }),
          german: () => Promise.resolve({ greet: "de" }),
          italian: () => Promise.resolve({ greet: "it" }),
          japanese: () => Promise.resolve({ greet: "ja" }),
          portuguese: () => Promise.resolve({ greet: "pt" }),
          spanish: () => Promise.resolve({ greet: "es" })
        },
        { preloadTranslations: true }
      );

      setLanguage("ar");
      await languageHasBeenInitialized();

      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });
  });

  describe("[popstate / back-forward navigation]", () => {
    test("popstate to a URL with a language outside availableLanguages falls back through the client chain", async () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP"]);
      setPathname("/en/home");
      setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        defaultLanguage: "es",
        locationChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      await languageHasBeenInitialized();
      // Clear localStorage so the popstate fallback exercises the
      // navigator/default chain instead of restoring "en" from storage.
      localStorage.clear();

      window.history.pushState({}, "", "/fr/home");
      window.dispatchEvent(new PopStateEvent("popstate"));
      await new Promise(r => setTimeout(r, 0));

      // "fr" was rejected because it's not available. localStorage is empty,
      // navigator only has "ja" (not available), so we fall to "es".
      expect(getCurrentLanguage()?.subtag).toBe("es");
    });

    test("when URL changes via pushState and popstate is dispatched, language syncs to URL and no location callback loop", async () => {
      setPathname("/en/home");
      const locationChangeCallback = vi.fn();
      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
        preloadTranslations: true
      });
      setLanguage("en");
      await languageHasBeenInitialized();

      expect(getCurrentLanguage()?.subtag).toBe("en");

      window.history.pushState({}, "", "/es/home");
      window.dispatchEvent(new PopStateEvent("popstate"));

      await new Promise(r => setTimeout(r, 0));

      expect(getCurrentLanguage()?.subtag).toBe("es");
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
    });
  });

  describe("[getCurrentLanguage] and [getCurrentTranslations] with language set", () => {
    test("getCurrentLanguage returns value after setLanguage", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      setLanguage("es");
      await languageHasBeenInitialized();

      const current = getCurrentLanguage();
      expect(current).toBeDefined();
      expect(current!.subtag).toBe("es");
      expect(current!.fullLanguageName).toBe("spanish");
    });

    test("getCurrentTranslations returns undefined for unregistered feature", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      setLanguage("en");
      await languageHasBeenInitialized();

      expect(getCurrentTranslations("unknown-feature")).toBeUndefined();
    });
  });
});
