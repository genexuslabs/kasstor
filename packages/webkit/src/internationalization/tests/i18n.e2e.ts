/**
 * E2E tests for i18n. Require browser environment (window, document,
 * localStorage, history). Use controlled pathname via history.replaceState
 * and do not depend on real navigation.
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getCurrentLanguage,
  getCurrentTranslations,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "../index.js";
import type { KasstorLanguage } from "../types.js";

const FEATURE_MAIN = "app-main";
const FEATURE_TRIAL = "trial";

type AppMainShape = { greet: string; footer: string };
type TrialShape = { price: string; limit: string };

const createEnEsLoader = <T extends Record<string, unknown>>(
  en: T,
  es: T
): Record<KasstorLanguage, () => Promise<T>> => ({
  arabic: () => Promise.resolve(en),
  chinese: () => Promise.resolve(en),
  english: () => Promise.resolve(en),
  french: () => Promise.resolve(en),
  german: () => Promise.resolve(en),
  italian: () => Promise.resolve(en),
  japanese: () => Promise.resolve(en),
  portuguese: () => Promise.resolve(en),
  spanish: () => Promise.resolve(es)
});

const subscriberIds: string[] = [];

function trackSubscriber(id: string) {
  subscriberIds.push(id);
}

function resetI18nState() {
  subscriberIds.forEach(id => unsubscribeToLanguageChanges(id));
  subscriberIds.length = 0;
  delete (globalThis as unknown as { kasstorWebkitI18n?: unknown }).kasstorWebkitI18n;
}

function setPathname(pathname: string) {
  window.history.replaceState({}, "", pathname);
}

describe("[i18n e2e]", () => {
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
        )
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
        createEnEsLoader({ greet: "Hello", footer: "A" }, { greet: "Hola", footer: "A" })
      );
      registerTranslations(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hi", footer: "B" }, { greet: "Hola", footer: "B" })
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
      registerTranslations<AppMainShape>(FEATURE_MAIN, lazyLoader);

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
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader);

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
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

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
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

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
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader1);
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
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader2);
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
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

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
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader);
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader);

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(mainLoader.spanish).toHaveBeenCalledTimes(1);
      expect(trialLoader.spanish).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
      expect(getCurrentTranslations<TrialShape>(FEATURE_TRIAL)!.price).toBe("Gratis");
    });
  });

  describe("[setLanguage]", () => {
    test("accepts subtag and full name", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      setLanguage("es");
      await languageHasBeenInitialized();
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");

      setLanguage("english");
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
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

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
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

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
        english: 30,
        spanish: 10
      };
      const raceLoader: Record<KasstorLanguage, () => Promise<AppMainShape>> = {
        arabic: () => Promise.resolve({ greet: "ar", footer: "" }),
        chinese: () => Promise.resolve({ greet: "zh", footer: "" }),
        english: () =>
          new Promise(r => setTimeout(() => r({ greet: "Hello", footer: "" }), delays.english)),
        french: () => Promise.resolve({ greet: "fr", footer: "" }),
        german: () => Promise.resolve({ greet: "de", footer: "" }),
        italian: () => Promise.resolve({ greet: "it", footer: "" }),
        japanese: () => Promise.resolve({ greet: "ja", footer: "" }),
        portuguese: () => Promise.resolve({ greet: "pt", footer: "" }),
        spanish: () =>
          new Promise(r => setTimeout(() => r({ greet: "Hola", footer: "" }), delays.spanish))
      };
      registerTranslations(FEATURE_MAIN, raceLoader);

      setLanguage("english");
      setLanguage("spanish");
      await new Promise(r => setTimeout(r, 50));

      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations!.greet).toBe("Hola");
    });
  });

  describe("[languageHasBeenInitialized]", () => {
    test("resolves after first setLanguage and translations are loaded", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

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

  describe("[multiple features]", () => {
    test("two features receive correct translations after setLanguage", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hello", footer: "Footer" }, { greet: "Hola", footer: "Pie" })
      );
      registerTranslations<TrialShape>(
        FEATURE_TRIAL,
        createEnEsLoader({ price: "Free", limit: "10" }, { price: "Gratis", limit: "10" })
      );

      setLanguage("es");
      await languageHasBeenInitialized();

      const main = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      const trial = getCurrentTranslations<TrialShape>(FEATURE_TRIAL);

      expect(main!.greet).toBe("Hola");
      expect(main!.footer).toBe("Pie");
      expect(trial!.price).toBe("Gratis");
      expect(trial!.limit).toBe("10");
    });

    test("subscribers of each feature receive only their feature translations", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hello", footer: "" }, { greet: "Hola", footer: "" })
      );
      registerTranslations<TrialShape>(
        FEATURE_TRIAL,
        createEnEsLoader({ price: "Free", limit: "10" }, { price: "Gratis", limit: "10" })
      );

      const mainReceived: AppMainShape[] = [];
      const trialReceived: TrialShape[] = [];

      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => mainReceived.push(t as AppMainShape))
      );
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_TRIAL, t => trialReceived.push(t as TrialShape))
      );

      setLanguage("es");
      await languageHasBeenInitialized();

      expect(mainReceived.length).toBeGreaterThanOrEqual(1);
      expect(mainReceived[mainReceived.length - 1].greet).toBe("Hola");
      expect(trialReceived.length).toBeGreaterThanOrEqual(1);
      expect(trialReceived[trialReceived.length - 1].price).toBe("Gratis");
    });
  });

  describe("[register after setLanguage]", () => {
    test("registering a new feature when language is already set loads that language for the feature", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));
      setLanguage("es");
      await languageHasBeenInitialized();

      registerTranslations(
        FEATURE_TRIAL,
        createEnEsLoader({ price: "Free", limit: "10" }, { price: "Gratis", limit: "10" })
      );

      await new Promise(r => setTimeout(r, 0));

      const trial = getCurrentTranslations<TrialShape>(FEATURE_TRIAL);
      expect(trial!.price).toBe("Gratis");
    });
  });

  describe("[unsubscribe]", () => {
    test("after unsubscribe callback is not called on language change", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

      let callCount = 0;
      const id = subscribeToLanguageChanges(FEATURE_MAIN, () => {
        callCount++;
      });
      trackSubscriber(id);

      setLanguage("en");
      await languageHasBeenInitialized();
      expect(callCount).toBeGreaterThanOrEqual(1);

      unsubscribeToLanguageChanges(id);
      const countAfterUnsub = callCount;

      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));

      expect(callCount).toBe(countAfterUnsub);
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

  describe("[RTL]", () => {
    test("setting Arabic sets dir to rtl on document", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });
      registerTranslations(FEATURE_MAIN, {
        arabic: () => Promise.resolve({ greet: "مرحبا" }),
        chinese: () => Promise.resolve({ greet: "zh" }),
        english: () => Promise.resolve({ greet: "Hello" }),
        french: () => Promise.resolve({ greet: "fr" }),
        german: () => Promise.resolve({ greet: "de" }),
        italian: () => Promise.resolve({ greet: "it" }),
        japanese: () => Promise.resolve({ greet: "ja" }),
        portuguese: () => Promise.resolve({ greet: "pt" }),
        spanish: () => Promise.resolve({ greet: "es" })
      });

      setLanguage("ar");
      await languageHasBeenInitialized();

      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });
  });

  describe("[popstate / back-forward navigation]", () => {
    test("when URL changes via pushState and popstate is dispatched, language syncs to URL and no location callback loop", async () => {
      setPathname("/en/home");
      const locationChangeCallback = vi.fn();
      setInitialApplicationLanguage({
        locationChangeCallback,
        languageChangeCallback: () => {}
      });
      registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));
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

