/**
 * E2E tests for lazy per-feature translation loading. Verify that only
 * features with active subscribers (or preloadTranslations: true) have
 * their translations loaded, reducing unnecessary network requests.
 *
 * Require browser environment (window, document, localStorage, history).
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getCurrentTranslations,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "../index.js";
import type { AppMainShape, TrialShape } from "./i18n-e2e-helpers.js";
import {
  FEATURE_MAIN,
  FEATURE_TRIAL,
  resetI18nState,
  setPathname,
  trackSubscriber
} from "./i18n-e2e-helpers.js";

/**
 * Creates a spy loader where each language function is a vi.fn().
 * Optionally accepts a delay in ms to simulate async loading.
 */
const createSpyLoader = <T extends Record<string, unknown>>(en: T, es: T, delayMs = 0) => {
  const makeResolver = (value: T) =>
    delayMs > 0
      ? () => new Promise<T>(r => setTimeout(() => r(value), delayMs))
      : () => Promise.resolve(value);

  return {
    ar: vi.fn(makeResolver(en)),
    de: vi.fn(makeResolver(en)),
    en: vi.fn(makeResolver(en)),
    es: vi.fn(makeResolver(es)),
    fr: vi.fn(makeResolver(en)),
    it: vi.fn(makeResolver(en)),
    ja: vi.fn(makeResolver(en)),
    pt: vi.fn(makeResolver(en)),
    zh: vi.fn(makeResolver(en))
  };
};

describe("[i18n e2e] lazy per-feature loading", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[subscriber-gated loading]", () => {
    test("feature without subscribers is NOT loaded on setLanguage", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );
      const trialLoader = createSpyLoader<TrialShape>(
        { price: "Free", limit: "10" },
        { price: "Gratis", limit: "10" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader);
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader);

      // Only subscribe to MAIN
      trackSubscriber(subscribeToLanguageChanges(FEATURE_MAIN, () => {}));

      setLanguage("en");
      await languageHasBeenInitialized();

      expect(mainLoader.en).toHaveBeenCalledTimes(1);
      expect(trialLoader.en).not.toHaveBeenCalled();
    });

    test("preloadTranslations bypasses subscriber requirement", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, loader, {
        preloadTranslations: true
      });

      // No subscribers
      setLanguage("en");
      await languageHasBeenInitialized();

      expect(loader.en).toHaveBeenCalledTimes(1);
      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations).toBeDefined();
      expect(translations!.greet).toBe("Hello");
    });

    test("first subscriber triggers on-demand load when language is already set", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);
      setLanguage("en");
      await languageHasBeenInitialized();

      // No subscriber yet — loader should NOT have been called
      expect(loader.en).not.toHaveBeenCalled();

      const received: AppMainShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received.push(t as AppMainShape))
      );

      // Allow on-demand load to complete
      await new Promise(r => setTimeout(r, 0));

      expect(loader.en).toHaveBeenCalledTimes(1);
      expect(received.length).toBe(1);
      expect(received[0].greet).toBe("Hello");
    });

    test("all subscribers unsubscribe — feature NOT loaded on next language change", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

      const id = subscribeToLanguageChanges(FEATURE_MAIN, () => {});
      trackSubscriber(id);

      setLanguage("en");
      await languageHasBeenInitialized();

      // English was loaded because there was a subscriber
      expect(loader.en).toHaveBeenCalledTimes(1);

      unsubscribeToLanguageChanges(id);

      // Switch to spanish — feature has 0 subscribers now
      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));

      expect(loader.es).not.toHaveBeenCalled();
    });

    test("resubscribe after full unsubscription triggers load for current language", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

      // Subscribe, load english, unsubscribe
      const id = subscribeToLanguageChanges(FEATURE_MAIN, () => {});
      setLanguage("en");
      await languageHasBeenInitialized();
      unsubscribeToLanguageChanges(id);

      // Switch to spanish without subscriber — not loaded
      setLanguage("es");
      await new Promise(r => setTimeout(r, 0));
      expect(loader.es).not.toHaveBeenCalled();

      // Resubscribe — should trigger on-demand load for spanish
      const received: AppMainShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received.push(t as AppMainShape))
      );
      await new Promise(r => setTimeout(r, 0));

      expect(loader.es).toHaveBeenCalledTimes(1);
      expect(received.length).toBe(1);
      expect(received[0].greet).toBe("Hola");
    });
  });

  describe("[granular cache invalidation]", () => {
    test("re-registering one feature does not bust other features cache", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const mainLoader1 = createSpyLoader<AppMainShape>(
        { greet: "Hello v1", footer: "" },
        { greet: "Hola v1", footer: "" }
      );
      const trialLoader = createSpyLoader<TrialShape>(
        { price: "Free", limit: "10" },
        { price: "Gratis", limit: "10" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader1, {
        preloadTranslations: true
      });
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader, {
        preloadTranslations: true
      });

      setLanguage("en");
      await languageHasBeenInitialized();

      expect(mainLoader1.en).toHaveBeenCalledTimes(1);
      expect(trialLoader.en).toHaveBeenCalledTimes(1);

      // Re-register MAIN with new loader
      const mainLoader2 = createSpyLoader<AppMainShape>(
        { greet: "Hello v2", footer: "" },
        { greet: "Hola v2", footer: "" }
      );
      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader2, {
        preloadTranslations: true
      });
      await new Promise(r => setTimeout(r, 0));

      // New MAIN loader was called, TRIAL loader was NOT re-called (cached)
      expect(mainLoader2.en).toHaveBeenCalledTimes(1);
      expect(trialLoader.en).toHaveBeenCalledTimes(1);
      expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello v2");
    });
  });

  describe("[mid-flight and race conditions]", () => {
    test("new subscriber for unloaded feature during in-flight language load", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      // Feature A: subscribed, with delayed loader
      const mainLoader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" },
        20 // 20ms delay
      );
      // Feature B: NOT subscribed initially
      const trialLoader = createSpyLoader<TrialShape>(
        { price: "Free", limit: "10" },
        { price: "Gratis", limit: "10" }
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, mainLoader);
      registerTranslations<TrialShape>(FEATURE_TRIAL, trialLoader);

      trackSubscriber(subscribeToLanguageChanges(FEATURE_MAIN, () => {}));

      // Start loading — only MAIN has subscribers
      setLanguage("en");

      // Before A's delayed load completes, subscribe to B
      const trialReceived: TrialShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_TRIAL, t => trialReceived.push(t as TrialShape))
      );

      // Wait for all loads to complete
      await new Promise(r => setTimeout(r, 50));

      expect(mainLoader.en).toHaveBeenCalledTimes(1);
      expect(trialLoader.en).toHaveBeenCalledTimes(1);
      expect(trialReceived.length).toBeGreaterThanOrEqual(1);
      expect(trialReceived[trialReceived.length - 1].price).toBe("Free");
    });

    test("rapid language switching with subscriber add/remove produces consistent state", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

      // Subscribe, switch languages, unsub, resub, switch again
      const id1 = subscribeToLanguageChanges(FEATURE_MAIN, () => {});
      setLanguage("en");
      setLanguage("es");
      unsubscribeToLanguageChanges(id1);

      const finalReceived: AppMainShape[] = [];
      const id2 = subscribeToLanguageChanges(FEATURE_MAIN, t =>
        finalReceived.push(t as AppMainShape)
      );
      trackSubscriber(id2);
      setLanguage("en");

      await new Promise(r => setTimeout(r, 0));

      // Final state should be english
      const translations = getCurrentTranslations<AppMainShape>(FEATURE_MAIN);
      expect(translations).toBeDefined();
      expect(translations!.greet).toBe("Hello");
    });

    test("on-demand callback NOT fired if language changed during load (stale prevention)", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" },
        30 // 30ms delay to simulate slow load
      );
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

      setLanguage("en");
      await languageHasBeenInitialized();

      // Subscribe — triggers on-demand load for english (30ms delay)
      const received: AppMainShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received.push(t as AppMainShape))
      );

      // Immediately switch language before on-demand load completes
      setLanguage("es");

      // Wait for all loads to complete
      await new Promise(r => setTimeout(r, 60));

      // The on-demand english callback should NOT have fired (language mismatch).
      // The subscriber should have received spanish via notifyLanguageChange.
      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[received.length - 1].greet).toBe("Hola");

      // Verify no english translation was pushed
      const hasEnglish = received.some(t => t.greet === "Hello");
      expect(hasEnglish).toBe(false);
    });
  });

  describe("[register after subscribe]", () => {
    test("registerTranslations after subscribe loads and notifies when language is set", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      // Subscribe BEFORE registering the loader
      const received: AppMainShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received.push(t as AppMainShape))
      );

      setLanguage("en");
      await languageHasBeenInitialized();

      // Now register the translations — subscriber count > 0 triggers loading
      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createSpyLoader<AppMainShape>({ greet: "Hello", footer: "" }, { greet: "Hola", footer: "" })
      );
      await new Promise(r => setTimeout(r, 0));

      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[received.length - 1].greet).toBe("Hello");
    });

    test("registerTranslations with preload=false and language already set does NOT download until someone subscribes", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      setLanguage("en");
      await languageHasBeenInitialized();

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" }
      );
      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);

      // Loader should NOT have been called (no subscribers, no preload)
      expect(loader.en).not.toHaveBeenCalled();

      // Subscribe triggers on-demand load
      trackSubscriber(subscribeToLanguageChanges(FEATURE_MAIN, () => {}));
      await new Promise(r => setTimeout(r, 0));

      expect(loader.en).toHaveBeenCalledTimes(1);
    });
  });

  describe("[performance verification]", () => {
    test("only 1 out of 5 features loaded when only 1 has subscribers", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const features = ["feat-1", "feat-2", "feat-3", "feat-4", "feat-5"] as const;
      const loaders = features.map(id => ({
        id,
        loader: createSpyLoader({ value: id }, { value: `${id}-es` })
      }));

      for (const { id, loader } of loaders) {
        registerTranslations(id, loader);
      }

      // Only subscribe to feat-3
      trackSubscriber(subscribeToLanguageChanges("feat-3", () => {}));

      setLanguage("en");
      await languageHasBeenInitialized();

      // Only feat-3 should have been loaded
      for (const { id, loader } of loaders) {
        if (id === "feat-3") {
          expect(loader.en).toHaveBeenCalledTimes(1);
        } else {
          expect(loader.en).not.toHaveBeenCalled();
        }
      }
    });

    test("second subscriber during in-flight load reuses same request", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      const loader = createSpyLoader<AppMainShape>(
        { greet: "Hello", footer: "" },
        { greet: "Hola", footer: "" },
        20 // delay to keep promise in-flight
      );

      registerTranslations<AppMainShape>(FEATURE_MAIN, loader);
      setLanguage("en");
      await languageHasBeenInitialized();

      const received1: AppMainShape[] = [];
      const received2: AppMainShape[] = [];

      // Subscriber 1 triggers on-demand load
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received1.push(t as AppMainShape))
      );

      // Subscriber 2 arrives while load is in-flight
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received2.push(t as AppMainShape))
      );

      await new Promise(r => setTimeout(r, 50));

      // Loader called only once (cached promise reused)
      expect(loader.en).toHaveBeenCalledTimes(1);

      // Both subscribers received translations
      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);
      expect(received1[0].greet).toBe("Hello");
      expect(received2[0].greet).toBe("Hello");
    });

    test("subscriber receives on-demand callback even if translations were already loaded (preload)", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createSpyLoader<AppMainShape>(
          { greet: "Hello", footer: "" },
          { greet: "Hola", footer: "" }
        ),
        { preloadTranslations: true }
      );

      setLanguage("en");
      await languageHasBeenInitialized();

      // Translations are already loaded. Subscribe now.
      const received: AppMainShape[] = [];
      trackSubscriber(
        subscribeToLanguageChanges(FEATURE_MAIN, t => received.push(t as AppMainShape))
      );

      // On-demand callback should fire in microtask
      await new Promise(r => setTimeout(r, 0));

      // At least one callback with the correct translations (the on-demand one)
      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[received.length - 1].greet).toBe("Hello");
    });
  });
});

