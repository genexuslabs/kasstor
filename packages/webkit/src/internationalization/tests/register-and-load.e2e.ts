/**
 * E2E tests for i18n registration and translation loading. Require browser
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
import type { AppMainShape, TrialShape } from "./i18n-e2e-helpers.js";
import {
  createEnEsLoader,
  FEATURE_MAIN,
  FEATURE_TRIAL,
  resetI18nState,
  setPathname
} from "./i18n-e2e-helpers.js";

describe("[i18n e2e] register and load", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[registerTranslations]", () => {
    test("registers a feature with a loader and loads current language when set", async () => {
      setPathname("/en/home");
      const locationChangeCallback = vi.fn();
      const languageChangeCallback = vi.fn();
      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback
      });

      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createEnEsLoader(
          { greet: "Hello", footer: "© 2024" },
          { greet: "Hola", footer: "© 2024" }
        ),
        { preloadTranslations: true }
      );

      await languageHasBeenInitialized();

      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations).toBeDefined();
      expect(translations!.greet).toBe("Hello");
    });

    test("emits console.warn when same featureId is registered again and replaces loader", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({
        locationChangeCallback: () => {}
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      registerTranslations(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hello", footer: "A" }, { greet: "Hola", footer: "A" }),
        { preloadTranslations: true }
      );
      registerTranslations(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hi", footer: "B" }, { greet: "Hola", footer: "B" }),
        { preloadTranslations: true }
      );

      await languageHasBeenInitialized();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(FEATURE_MAIN));
      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations!.greet).toBe("Hi");

      warnSpy.mockRestore();
    });
  });

  describe("[lazy loading of translations]", () => {
    test("only the selected language loader is invoked, not all languages at once", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const createSpyLoader = () => ({
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      });

      const lazyLoader = createSpyLoader();
      registerTranslations<AppMainShape>(FEATURE_MAIN, lazyLoader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();

      expect(lazyLoader.english).toHaveBeenCalledTimes(1);
      expect(lazyLoader.spanish).not.toHaveBeenCalled();
      expect(lazyLoader.arabic).not.toHaveBeenCalled();
      expect(lazyLoader.chinese).not.toHaveBeenCalled();
      expect(lazyLoader.french).not.toHaveBeenCalled();
      expect(lazyLoader.german).not.toHaveBeenCalled();
      expect(lazyLoader.italian).not.toHaveBeenCalled();
      expect(lazyLoader.japanese).not.toHaveBeenCalled();
      expect(lazyLoader.portuguese).not.toHaveBeenCalled();

      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));

      expect(lazyLoader.spanish).toHaveBeenCalledTimes(1);
      expect(lazyLoader.english).toHaveBeenCalledTimes(1);

      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations!.greet).toBe("Hola");
    });

    test("switching language invokes only the new language loader per feature", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();
      setLanguage("ja");
      await new Promise(r => setTimeout(r, 0));

      expect(mainLoader.english).toHaveBeenCalledTimes(1);
      expect(mainLoader.japanese).toHaveBeenCalledTimes(1);
      expect(mainLoader.spanish).not.toHaveBeenCalled();
    });
  });

  describe("[translation load cache]", () => {
    test("concurrent setLanguage for same language runs loaders once", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      setLanguage("en");
      setLanguage("en");
      await languageHasBeenInitialized();

      expect(loader.english).toHaveBeenCalledTimes(1);
    });

    test("setLanguage for same language after first load resolved uses cache and does not run loaders again", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();
      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));

      expect(loader.english).toHaveBeenCalledTimes(1);
    });

    test("registerTranslations clears cache so replacing a feature loader causes next setLanguage to run new loader", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader1 = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello v1", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader1, {
        preloadTranslations: true
      });
      setLanguage("en");
      await languageHasBeenInitialized();

      const loader2 = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello v2", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader2, {
        preloadTranslations: true
      });
      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));

      expect(loader1.english).toHaveBeenCalledTimes(1);
      expect(loader2.english).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello v2");
    });

    test("setLanguage when no features registered does not throw and current language updates", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(getCurrentLanguage()?.subtag).toBe("es");
      expect(getCurrentTranslations("any-feature")).toBeUndefined();
    });

    test("switching language then back to first language runs each loader once (cache reused)", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();
      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));
      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));

      expect(loader.english).toHaveBeenCalledTimes(1);
      expect(loader.spanish).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
    });

    test("multiple features: one setLanguage runs each feature loader once", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader = {
        arabic: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        chinese: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        english: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        french: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        german: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        italian: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        japanese: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        portuguese: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        spanish: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      const trialLoader = {
        arabic: vi.fn(() => Promise.resolve({ price: "ar", limit: "" })),
        chinese: vi.fn(() => Promise.resolve({ price: "zh", limit: "" })),
        english: vi.fn(() => Promise.resolve({ price: "Free", limit: "10" })),
        french: vi.fn(() => Promise.resolve({ price: "fr", limit: "" })),
        german: vi.fn(() => Promise.resolve({ price: "de", limit: "" })),
        italian: vi.fn(() => Promise.resolve({ price: "it", limit: "" })),
        japanese: vi.fn(() => Promise.resolve({ price: "ja", limit: "" })),
        portuguese: vi.fn(() => Promise.resolve({ price: "pt", limit: "" })),
        spanish: vi.fn(() => Promise.resolve({ price: "Gratis", limit: "10" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader, {
        preloadTranslations: true
      });
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader, {
        preloadTranslations: true
      });

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(mainLoader.spanish).toHaveBeenCalledTimes(1);
      expect(trialLoader.spanish).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
      expect(getCurrentTranslations<TrialShape>(FEATURE_TRIAL)!.price).toBe("Gratis");
    });
  });
});

