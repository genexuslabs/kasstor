/**
 * E2E tests for language-change subscription and unsubscribe. Require browser
 * environment (window, document, localStorage, history).
 */

import { afterEach, describe, expect, test } from "vitest";
import {
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "../index.js";
import {
  createEnEsLoader,
  FEATURE_MAIN,
  resetI18nState,
  setPathname,
  trackSubscriber
} from "./i18n-e2e-helpers.js";

describe("[i18n e2e] subscriber", () => {
  afterEach(() => {
    resetI18nState();
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
});

