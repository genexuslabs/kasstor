/**
 * E2E tests for setInitialApplicationLanguage and related callbacks. Require
 * browser environment (window, document, localStorage, history).
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import { registerTranslations, setInitialApplicationLanguage, setLanguage } from "../index.js";
import { createEnEsLoader, FEATURE_MAIN, resetI18nState, setPathname } from "./i18n-e2e-helpers.js";

describe("[i18n e2e] setInitialApplicationLanguage", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[setInitialApplicationLanguage]", () => {
    test("resolves language from URL and returns initialLanguage and locationToReplace", () => {
      setPathname("/es/dashboard");

      const locationChangeCallback = vi.fn();
      const result = setInitialApplicationLanguage({
        locationChangeCallback,
        pathname: "/es/dashboard"
      });

      expect(result.initialLanguage).toBe("es");
      expect(result.locationToReplace).toBeUndefined();
    });

    test("with pathname without language segment returns locationToReplace with subtag prepended", () => {
      setPathname("/dashboard");

      const result = setInitialApplicationLanguage({
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(result.locationToReplace).toMatch(/^\/[a-z]{2}\/dashboard$/);
    });

    test("stores callbacks so setLanguage invokes them", async () => {
      setPathname("/en/home");
      const locationChangeCallback = vi.fn();
      const languageChangeCallback = vi.fn();

      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      setLanguage("es", true);

      await new Promise(r => setTimeout(r, 0));

      expect(languageChangeCallback).toHaveBeenCalledWith("es");
      expect(locationChangeCallback).toHaveBeenCalled();
    });
  });

  describe("[callbacks order]", () => {
    test("languageChangeCallback is called before locationChangeCallback on setLanguage", async () => {
      setPathname("/en/home");
      const order: string[] = [];
      const locationChangeCallback = vi.fn(() => order.push("location"));
      const languageChangeCallback = vi.fn(() => order.push("language"));

      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      setLanguage("es", true);
      await new Promise(r => setTimeout(r, 0));

      const languageIndex = order.indexOf("language");
      const locationIndex = order.indexOf("location");
      expect(languageIndex).toBeGreaterThanOrEqual(0);
      expect(locationIndex).toBeGreaterThanOrEqual(0);
      expect(languageIndex).toBeLessThan(locationIndex);
    });
  });

  describe("[availableLanguages and defaultLanguage]", () => {
    test("URL language outside availableLanguages is ignored, falls back to client/default", () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP"]);
      setPathname("/fr/dashboard");

      const result = setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        defaultLanguage: "es",
        locationChangeCallback: () => {},
        pathname: "/fr/dashboard"
      });

      expect(result.initialLanguage).toBe("es");
    });

    test("defaultLanguage 'es' wins when URL has no language and navigator has no match", () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP"]);
      setPathname("/dashboard");

      const result = setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        defaultLanguage: "es",
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(result.initialLanguage).toBe("es");
    });

    test("URL language inside availableLanguages is honored", () => {
      setPathname("/es/dashboard");

      const result = setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        locationChangeCallback: () => {},
        pathname: "/es/dashboard"
      });

      expect(result.initialLanguage).toBe("es");
    });

    test("invalid defaultLanguage outside list is coerced to 'en' with warn", () => {
      // Clear any persisted language from earlier tests so the resolution
      // falls past localStorage onto navigator + default.
      localStorage.clear();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      setPathname("/dashboard");
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP"]);

      const result = setInitialApplicationLanguage({
        availableLanguages: ["en", "es"],
        defaultLanguage: "fr",
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(result.initialLanguage).toBe("en");
      expect(kasstorWebkitI18n!.configuredDefaultLanguage).toBe("en");
      expect(warnSpy).toHaveBeenCalled();
    });

    test("empty availableLanguages is coerced to ['en'] with warn", () => {
      localStorage.clear();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      setPathname("/dashboard");

      setInitialApplicationLanguage({
        availableLanguages: [],
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(kasstorWebkitI18n!.availableLanguages).toEqual(new Set(["en"]));
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("[pathname without language]", () => {
    // TODO: This test is skipped because we are always using the window.location.pathname to get the language,
    // so we don't rely on the pathname parameter of setInitialApplicationLanguage for the browser.
    // TODO: We should fix this case in the future.
    test.skip("setInitialApplicationLanguage with pathname /dashboard returns locationToReplace with subtag", () => {
      const result = setInitialApplicationLanguage({
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(result.locationToReplace).toMatch(`/${result.initialLanguage}/dashboard`);
    });
  });
});

