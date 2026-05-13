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
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      });

      const lazyLoader = createSpyLoader();
      registerTranslations<AppMainShape>(FEATURE_MAIN, lazyLoader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();

      expect(lazyLoader.en).toHaveBeenCalledTimes(1);
      expect(lazyLoader.es).not.toHaveBeenCalled();
      expect(lazyLoader.ar).not.toHaveBeenCalled();
      expect(lazyLoader.zh).not.toHaveBeenCalled();
      expect(lazyLoader.fr).not.toHaveBeenCalled();
      expect(lazyLoader.de).not.toHaveBeenCalled();
      expect(lazyLoader.it).not.toHaveBeenCalled();
      expect(lazyLoader.ja).not.toHaveBeenCalled();
      expect(lazyLoader.pt).not.toHaveBeenCalled();

      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));

      expect(lazyLoader.es).toHaveBeenCalledTimes(1);
      expect(lazyLoader.en).toHaveBeenCalledTimes(1);

      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations!.greet).toBe("Hola");
    });

    test("switching language invokes only the new language loader per feature", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();
      setLanguage("ja");
      await new Promise(r => setTimeout(r, 0));

      expect(mainLoader.en).toHaveBeenCalledTimes(1);
      expect(mainLoader.ja).toHaveBeenCalledTimes(1);
      expect(mainLoader.es).not.toHaveBeenCalled();
    });
  });

  describe("[translation load cache]", () => {
    test("concurrent setLanguage for same language runs loaders once", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      setLanguage("en");
      setLanguage("en");
      await languageHasBeenInitialized();

      expect(loader.en).toHaveBeenCalledTimes(1);
    });

    test("setLanguage for same language after first load resolved uses cache and does not run loaders again", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();
      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));

      expect(loader.en).toHaveBeenCalledTimes(1);
    });

    test("registerTranslations clears cache so replacing a feature loader causes next setLanguage to run new loader", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader1 = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello v1", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader1, {
        preloadTranslations: true
      });
      setLanguage("en");
      await languageHasBeenInitialized();

      const loader2 = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello v2", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader2, {
        preloadTranslations: true
      });
      setLanguage("en");
      await new Promise(r => setTimeout(r, 0));

      expect(loader1.en).toHaveBeenCalledTimes(1);
      expect(loader2.en).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello v2");
    });

    test("setLanguage when no features registered does not throw and current language updates", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(getCurrentLanguage()).toBe("es");
      expect(getCurrentTranslations("any-feature")).toBeUndefined();
    });

    test("switching language then back to first language runs each loader once (cache reused)", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
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

      expect(loader.en).toHaveBeenCalledTimes(1);
      expect(loader.es).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
    });

    test("multiple features: one setLanguage runs each feature loader once", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader = {
        ar: vi.fn(() => Promise.resolve({ greet: "ar", footer: "" })),
        zh: vi.fn(() => Promise.resolve({ greet: "zh", footer: "" })),
        en: vi.fn(() => Promise.resolve({ greet: "Hello", footer: "" })),
        fr: vi.fn(() => Promise.resolve({ greet: "fr", footer: "" })),
        de: vi.fn(() => Promise.resolve({ greet: "de", footer: "" })),
        it: vi.fn(() => Promise.resolve({ greet: "it", footer: "" })),
        ja: vi.fn(() => Promise.resolve({ greet: "ja", footer: "" })),
        pt: vi.fn(() => Promise.resolve({ greet: "pt", footer: "" })),
        es: vi.fn(() => Promise.resolve({ greet: "Hola", footer: "" }))
      };
      const trialLoader = {
        ar: vi.fn(() => Promise.resolve({ price: "ar", limit: "" })),
        zh: vi.fn(() => Promise.resolve({ price: "zh", limit: "" })),
        en: vi.fn(() => Promise.resolve({ price: "Free", limit: "10" })),
        fr: vi.fn(() => Promise.resolve({ price: "fr", limit: "" })),
        de: vi.fn(() => Promise.resolve({ price: "de", limit: "" })),
        it: vi.fn(() => Promise.resolve({ price: "it", limit: "" })),
        ja: vi.fn(() => Promise.resolve({ price: "ja", limit: "" })),
        pt: vi.fn(() => Promise.resolve({ price: "pt", limit: "" })),
        es: vi.fn(() => Promise.resolve({ price: "Gratis", limit: "10" }))
      };
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader, {
        preloadTranslations: true
      });
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader, {
        preloadTranslations: true
      });

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(mainLoader.es).toHaveBeenCalledTimes(1);
      expect(trialLoader.es).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
      expect(getCurrentTranslations<TrialShape>(FEATURE_TRIAL)!.price).toBe("Gratis");
    });
  });
});

