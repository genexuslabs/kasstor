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

      expect(result.initialLanguage.subtag).toBe("es");
      expect(result.initialLanguage.fullLanguageName).toBe("spanish");
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

      expect(languageChangeCallback).toHaveBeenCalledWith(
        expect.objectContaining({ subtag: "es", fullLanguageName: "spanish" })
      );
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

  describe("[pathname without language]", () => {
    // TODO: This test is skipped because we are always using the window.location.pathname to get the language,
    // so we don't rely on the pathname parameter of setInitialApplicationLanguage for the browser.
    // TODO: We should fix this case in the future.
    test.skip("setInitialApplicationLanguage with pathname /dashboard returns locationToReplace with subtag", () => {
      const result = setInitialApplicationLanguage({
        locationChangeCallback: () => {},
        pathname: "/dashboard"
      });

      expect(result.locationToReplace).toMatch(`/${result.initialLanguage.subtag}/dashboard`);
    });
  });
});

