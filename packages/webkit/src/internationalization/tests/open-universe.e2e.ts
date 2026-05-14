/**
 * E2E coverage for the open-universe language model. Exercises the full
 * stack — `setInitialApplicationLanguage` → `setLanguage` → translations
 * loading → DOM attributes — with subtags outside the curated
 * `KnownKasstorLanguageSubtag` set, including the RTL direction registry.
 *
 * Browser-only: depends on `document` and `window.location`.
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getCurrentLanguage } from "../get-current-language.js";
import { getLanguageDirection } from "../get-language-direction.js";
import { registerLanguageDirection } from "../get-language-direction.js";
import { isLanguageAvailable } from "../is-language-available.js";
import { languageHasBeenInitialized } from "../language-has-been-initialized.js";
import { registerTranslations } from "../register-translations.js";
import { setInitialApplicationLanguage } from "../set-initial-application-language.js";
import { setLanguage } from "../set-language.js";
import { subscribeToLanguageChanges } from "../subscriber.js";
import type {
  KasstorLanguageSubtag,
  KasstorTranslationShape
} from "../types.js";
import {
  resetI18nState,
  setPathname,
  trackSubscriber
} from "./i18n-e2e-helpers.js";

type Greeting = { hello: string };

const FEATURE = "open-universe-feature";

/**
 * Builds a loader keyed by every base subtag the test plans to exercise.
 * We declare the keys explicitly so the loader covers what the host
 * registers — kasstor itself does not care which subtags exist beyond
 * structural validity.
 */
const buildLoader = (
  entries: Record<string, Greeting>
): Record<KasstorLanguageSubtag, () => Promise<KasstorTranslationShape>> => {
  const loader = {} as Record<KasstorLanguageSubtag, () => Promise<KasstorTranslationShape>>;
  for (const [subtag, value] of Object.entries(entries)) {
    loader[subtag as KasstorLanguageSubtag] = () => Promise.resolve(value);
  }
  return loader;
};

describe("[open-universe e2e]", () => {
  beforeEach(() => {
    setPathname("/");
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("dir");
    localStorage.clear();
  });

  afterEach(() => {
    resetI18nState();
  });

  test("host declares a subtag outside the curated set; setLanguage uses it", async () => {
    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        nl: { hello: "Hallo" }
      }),
      { preloadTranslations: true }
    );

    const result = setInitialApplicationLanguage({
      availableLanguages: ["en", "nl", "nl-NL"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    expect(result.initialLanguage).toBe("en");
    await languageHasBeenInitialized();

    setLanguage("nl-NL", false);
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(getCurrentLanguage()).toBe("nl-NL");
    expect(isLanguageAvailable("nl")).toBe(true);
    expect(isLanguageAvailable("nl-BE")).toBe(true); // wildcard-by-base
    expect(document.documentElement.getAttribute("lang")).toBe("nl-NL");
  });

  test("registerLanguageDirection drives <html dir> for a non-curated RTL subtag", async () => {
    // Hebrew IS in `RTL_LANGUAGES` by default; demonstrate the override
    // mechanism with a hypothetical RTL language outside the curated set.
    registerLanguageDirection("xqx", "rtl");
    expect(getLanguageDirection("xqx")).toBe("rtl");
    expect(getLanguageDirection("xqx-XQ")).toBe("rtl"); // region inherits direction

    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        xqx: { hello: "[xqx]Hello" }
      }),
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "xqx"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("xqx", false);
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(document.documentElement.getAttribute("lang")).toBe("xqx");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");

    // Restore default by re-registering an LTR direction (the test cleanup
    // resets globals but not the module-level override Map).
    registerLanguageDirection("xqx", "ltr");
  });

  test("wildcard-by-base survives a region-only narrowing", async () => {
    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        es: { hello: "Hola" }
      }),
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    // The bare base "es" is acceptable because it shares the base with
    // the declared "es-ES" entry.
    expect(isLanguageAvailable("es")).toBe(true);
    expect(isLanguageAvailable("es-AR")).toBe(true);
    expect(isLanguageAvailable("es-MX")).toBe(true);

    setLanguage("es-AR", false);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(getCurrentLanguage()).toBe("es-AR");
  });

  test("subscriber notifications reach the latest tag (region preserved)", async () => {
    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        es: { hello: "Hola" }
      }),
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    let lastTranslation: KasstorTranslationShape | undefined;
    const id = subscribeToLanguageChanges(FEATURE, t => {
      lastTranslation = t;
    });
    trackSubscriber(id);

    setLanguage("es-ES", false);
    await new Promise(resolve => setTimeout(resolve, 30));

    // Region change but base is the same → loader cache hits.
    expect(lastTranslation).toEqual({ hello: "Hola" });
    expect(getCurrentLanguage()).toBe("es-ES");
    expect(document.documentElement.getAttribute("lang")).toBe("es-ES");
  });

  test("URL with a region the host did NOT declare narrows to the declared base", async () => {
    setPathname("/es-AR/home");

    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        es: { hello: "Hola" }
      }),
      { preloadTranslations: true }
    );

    const result = setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });

    // `/es-AR/home` resolves to the host's declared form `"es"`. The host
    // gets `locationToReplace` pointing to `/es/home` so it can update the
    // URL — same rule as `localStorage` and `navigator.languages` so the
    // three resolution sources stay consistent.
    expect(result.initialLanguage).toBe("es");
    expect(result.locationToReplace).toBe("/es/home");
    await languageHasBeenInitialized();
    expect(getCurrentLanguage()).toBe("es");
  });

  test("URL with a region the host DID declare preserves the regional form", async () => {
    setPathname("/es-ES/home");

    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        es: { hello: "Hola" }
      }),
      { preloadTranslations: true }
    );

    const result = setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });

    expect(result.initialLanguage).toBe("es-ES");
    expect(result.locationToReplace).toBeUndefined();
    await languageHasBeenInitialized();
    expect(getCurrentLanguage()).toBe("es-ES");
  });

  test("localStorage with a region the host did NOT declare narrows to the declared base", async () => {
    setPathname("/");
    localStorage.setItem("kasstor-webkit__language", "es-AR");

    registerTranslations(
      FEATURE,
      buildLoader({
        en: { hello: "Hello" },
        es: { hello: "Hola" }
      }),
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    // The persisted `"es-AR"` falls outside the declared list verbatim,
    // but the base `"es"` is declared → narrowed to `"es"`.
    expect(getCurrentLanguage()).toBe("es");
  });
});
