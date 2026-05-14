/**
 * E2E tests for regional loader overrides:
 *
 *  - A loader entry keyed by a full regional tag (e.g. `"es-ES"`) is used
 *    verbatim when the current language matches that tag.
 *  - Region variants without an explicit override fall back to the base
 *    subtag loader entry.
 *  - The per-feature load cache deduplicates fall-back loads across
 *    different region variants that share the same base.
 *  - `getCurrentTranslations` does the same lookup: full tag first, base
 *    subtag fall-back.
 *  - The base subtag loader stays the source of truth for a feature that
 *    did NOT register a regional override even when other features did.
 *
 * Requires the browser environment because `setLanguage` updates
 * `document.documentElement.lang` and `localStorage`.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getCurrentLanguage } from "../get-current-language.js";
import { getCurrentTranslations } from "../get-current-translations.js";
import { languageHasBeenInitialized } from "../language-has-been-initialized.js";
import { registerTranslations } from "../register-translations.js";
import { setInitialApplicationLanguage } from "../set-initial-application-language.js";
import { setLanguage } from "../set-language.js";
import type { KasstorTranslationsLoader } from "../types.js";
import { resetI18nState, setPathname } from "./i18n-e2e-helpers.js";

type Greeting = { hello: string };

const FEATURE_WITH_OVERRIDE = "feature-with-regional-override";
const FEATURE_BASE_ONLY = "feature-base-only";

const mockNavigatorLanguages = (langs: string[]) => {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(langs);
};

describe("[i18n e2e] regional loader overrides", () => {
  beforeEach(() => {
    setPathname("/");
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("dir");
    localStorage.clear();
  });

  afterEach(() => {
    resetI18nState();
    vi.restoreAllMocks();
  });

  test("getCurrentTranslations returns the regional override bundle when present", async () => {
    const esLoad = vi.fn(() => Promise.resolve({ hello: "Hola" }));
    const esESLoad = vi.fn(() => Promise.resolve({ hello: "Hola, ¿qué tal?" }));

    const loader: KasstorTranslationsLoader<Greeting> = {
      en: () => Promise.resolve({ hello: "Hello" }),
      es: esLoad,
      "es-ES": esESLoad
    };
    registerTranslations(FEATURE_WITH_OVERRIDE, loader, {
      preloadTranslations: true
    });

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));

    expect(getCurrentLanguage()).toBe("es-ES");
    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola, ¿qué tal?"
    );
    expect(esESLoad).toHaveBeenCalledTimes(1);
    // The base loader must NOT be triggered when the regional override
    // covers the current tag.
    expect(esLoad).not.toHaveBeenCalled();
  });

  test("regional tag without an override falls back to the base subtag loader", async () => {
    const esLoad = vi.fn(() => Promise.resolve({ hello: "Hola" }));

    const loader: KasstorTranslationsLoader<Greeting> = {
      en: () => Promise.resolve({ hello: "Hello" }),
      es: esLoad
    };
    registerTranslations(FEATURE_BASE_ONLY, loader, {
      preloadTranslations: true
    });

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-AR", false);
    await new Promise(r => setTimeout(r, 30));

    expect(getCurrentLanguage()).toBe("es-AR");
    expect(getCurrentTranslations<Greeting>(FEATURE_BASE_ONLY)?.hello).toBe(
      "Hola"
    );
    expect(esLoad).toHaveBeenCalledTimes(1);
  });

  test("regional variants sharing the same base subtag reuse a single load", async () => {
    const esLoad = vi.fn(() => Promise.resolve({ hello: "Hola" }));

    const loader: KasstorTranslationsLoader<Greeting> = {
      en: () => Promise.resolve({ hello: "Hello" }),
      es: esLoad
    };
    registerTranslations(FEATURE_BASE_ONLY, loader, {
      preloadTranslations: true
    });

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-AR", false);
    await new Promise(r => setTimeout(r, 10));
    setLanguage("es-MX", false);
    await new Promise(r => setTimeout(r, 10));
    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));

    // All three regional variants resolve to the base loader entry, so
    // the base loader must run exactly once thanks to the per-loadKey
    // cache.
    expect(esLoad).toHaveBeenCalledTimes(1);
    expect(getCurrentLanguage()).toBe("es-ES");
    expect(getCurrentTranslations<Greeting>(FEATURE_BASE_ONLY)?.hello).toBe(
      "Hola"
    );
  });

  test("two features in the same setLanguage call resolve independently (one regional, one base)", async () => {
    const esBaseRegional = vi.fn(() => Promise.resolve({ hello: "Hola" }));
    const esESRegional = vi.fn(() =>
      Promise.resolve({ hello: "Hola, ¿qué tal?" })
    );
    const esBaseOnly = vi.fn(() => Promise.resolve({ hello: "Hola plain" }));

    registerTranslations<Greeting>(
      FEATURE_WITH_OVERRIDE,
      {
        en: () => Promise.resolve({ hello: "Hello" }),
        es: esBaseRegional,
        "es-ES": esESRegional
      },
      { preloadTranslations: true }
    );
    registerTranslations<Greeting>(
      FEATURE_BASE_ONLY,
      {
        en: () => Promise.resolve({ hello: "Hello plain" }),
        es: esBaseOnly
      },
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));

    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola, ¿qué tal?"
    );
    expect(getCurrentTranslations<Greeting>(FEATURE_BASE_ONLY)?.hello).toBe(
      "Hola plain"
    );
    expect(esESRegional).toHaveBeenCalledTimes(1);
    expect(esBaseOnly).toHaveBeenCalledTimes(1);
    expect(esBaseRegional).not.toHaveBeenCalled();
  });

  test("switching from regional override to base subtag keeps both bundles available", async () => {
    const esLoad = vi.fn(() => Promise.resolve({ hello: "Hola" }));
    const esESLoad = vi.fn(() => Promise.resolve({ hello: "Hola, ¿qué tal?" }));

    registerTranslations<Greeting>(
      FEATURE_WITH_OVERRIDE,
      {
        en: () => Promise.resolve({ hello: "Hello" }),
        es: esLoad,
        "es-ES": esESLoad
      },
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));
    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola, ¿qué tal?"
    );

    setLanguage("es", false);
    await new Promise(r => setTimeout(r, 30));
    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola"
    );

    // Switching back to the regional override must NOT re-run the loader
    // — each loadKey is cached once.
    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));
    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola, ¿qué tal?"
    );
    expect(esESLoad).toHaveBeenCalledTimes(1);
    expect(esLoad).toHaveBeenCalledTimes(1);
  });

  test("a feature whose loader has neither full tag nor base resolves to undefined", async () => {
    const enLoad = vi.fn(() => Promise.resolve({ hello: "Hello" }));

    // Loader has English only — no Spanish coverage at all.
    registerTranslations<Greeting>(
      FEATURE_BASE_ONLY,
      { en: enLoad },
      { preloadTranslations: true }
    );

    setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    setLanguage("es-ES", false);
    await new Promise(r => setTimeout(r, 30));

    expect(getCurrentLanguage()).toBe("es-ES");
    // No loader for "es-ES" or its base "es" — feature contributes nothing.
    expect(getCurrentTranslations<Greeting>(FEATURE_BASE_ONLY)).toBeUndefined();
    expect(enLoad).toHaveBeenCalledTimes(1); // initial language run only
  });

  test("setInitialApplicationLanguage resolves navigator 'es-ES' to 'es-ES' when host declares it", async () => {
    mockNavigatorLanguages(["es-ES", "en-US"]);

    const esESLoad = vi.fn(() => Promise.resolve({ hello: "Hola, ¿qué tal?" }));
    registerTranslations<Greeting>(
      FEATURE_WITH_OVERRIDE,
      {
        en: () => Promise.resolve({ hello: "Hello" }),
        es: () => Promise.resolve({ hello: "Hola" }),
        "es-ES": esESLoad
      },
      { preloadTranslations: true }
    );

    const result = setInitialApplicationLanguage({
      availableLanguages: ["en", "es", "es-ES"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    expect(result.initialLanguage).toBe("es-ES");
    expect(getCurrentLanguage()).toBe("es-ES");
    expect(getCurrentTranslations<Greeting>(FEATURE_WITH_OVERRIDE)?.hello).toBe(
      "Hola, ¿qué tal?"
    );
    expect(esESLoad).toHaveBeenCalledTimes(1);
  });

  test("setInitialApplicationLanguage narrows navigator 'es-ES' to 'es' when host did NOT declare 'es-ES'", async () => {
    mockNavigatorLanguages(["es-ES", "en-US"]);

    const esLoad = vi.fn(() => Promise.resolve({ hello: "Hola" }));
    registerTranslations<Greeting>(
      FEATURE_BASE_ONLY,
      {
        en: () => Promise.resolve({ hello: "Hello" }),
        es: esLoad
      },
      { preloadTranslations: true }
    );

    const result = setInitialApplicationLanguage({
      availableLanguages: ["en", "es"],
      defaultLanguage: "en",
      strict: true,
      locationChangeCallback: () => {}
    });
    await languageHasBeenInitialized();

    expect(result.initialLanguage).toBe("es");
    expect(getCurrentLanguage()).toBe("es");
    expect(getCurrentTranslations<Greeting>(FEATURE_BASE_ONLY)?.hello).toBe(
      "Hola"
    );
    expect(esLoad).toHaveBeenCalledTimes(1);
  });
});
