/**
 * E2E tests for multiple features and register-after-setLanguage. Require
 * browser environment (window, document, localStorage, history).
 */

import { afterEach, describe, expect, test } from "vitest";
import {
  getCurrentTranslations,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges
} from "../index.js";
import {
  createEnEsLoader,
  FEATURE_MAIN,
  FEATURE_TRIAL,
  resetI18nState,
  setPathname,
  trackSubscriber
} from "./i18n-e2e-helpers.js";
import type { AppMainShape, TrialShape } from "./i18n-e2e-helpers.js";

describe("[i18n e2e] multiple features", () => {
  afterEach(() => {
    resetI18nState();
  });

  describe("[multiple features]", () => {
    test("two features receive correct translations after setLanguage", async () => {
      setPathname("/en/home");
      setInitialApplicationLanguage({ locationChangeCallback: () => {} });

      registerTranslations<AppMainShape>(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hello", footer: "Footer" }, { greet: "Hola", footer: "Pie" }),
        { preloadTranslations: true }
      );
      registerTranslations<TrialShape>(
        FEATURE_TRIAL,
        createEnEsLoader({ price: "Free", limit: "10" }, { price: "Gratis", limit: "10" }),
        { preloadTranslations: true }
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

      registerTranslations(
        FEATURE_MAIN,
        createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }),
        { preloadTranslations: true }
      );
      setLanguage("es");
      await languageHasBeenInitialized();

      registerTranslations(
        FEATURE_TRIAL,
        createEnEsLoader({ price: "Free", limit: "10" }, { price: "Gratis", limit: "10" }),
        { preloadTranslations: true }
      );

      await new Promise(r => setTimeout(r, 0));

      const trial = getCurrentTranslations<TrialShape>(FEATURE_TRIAL);
      expect(trial!.price).toBe("Gratis");
    });
  });
});
