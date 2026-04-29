/**
 * E2E tests for languageChangeComplete. Require browser environment
 * (window, document, localStorage, history).
 *
 * languageChangeComplete returns a Promise that resolves when the in-flight
 * language change has been fully applied. If multiple `setLanguage` calls
 * happen in burst, the Promise only resolves once the *latest* language has
 * been loaded — without applying any artificial delay (cached translations
 * resolve on the next microtask).
 */

import { afterEach, describe, expect, test } from "vitest";
import {
  getCurrentLanguage,
  getCurrentTranslations,
  languageChangeComplete,
  languageHasBeenInitialized,
  registerTranslations,
  setInitialApplicationLanguage,
  setLanguage,
  subscribeToLanguageChanges
} from "../index.js";
import type { KasstorLanguage } from "../types.js";
import type { AppMainShape } from "./i18n-e2e-helpers.js";
import {
  createEnEsLoader,
  FEATURE_MAIN,
  resetI18nState,
  setPathname,
  trackSubscriber
} from "./i18n-e2e-helpers.js";

/**
 * Wait for any in-flight loader Promises (from prior `setLanguage` calls
 * whose languages weren't the latest) to settle before `resetI18nState`
 * deletes the globals they touch in their `.then()` handlers.
 */
const waitForStaleLoaders = (ms: number) => new Promise(r => setTimeout(r, ms));

const buildDelayedLoader = (
  delays: Partial<Record<KasstorLanguage, number>>,
  payload: Partial<Record<KasstorLanguage, AppMainShape>> = {}
): Record<KasstorLanguage, () => Promise<AppMainShape>> => {
  const langs: KasstorLanguage[] = [
    "arabic",
    "chinese",
    "english",
    "french",
    "german",
    "italian",
    "japanese",
    "portuguese",
    "spanish"
  ];
  const loader = {} as Record<KasstorLanguage, () => Promise<AppMainShape>>;
  for (const lang of langs) {
    const delay = delays[lang] ?? 0;
    const value = payload[lang] ?? { greet: lang, footer: "" };
    loader[lang] =
      delay === 0
        ? () => Promise.resolve(value)
        : () => new Promise(resolve => setTimeout(() => resolve(value), delay));
  }
  return loader;
};

describe("[i18n e2e] languageChangeComplete", () => {
  afterEach(() => {
    resetI18nState();
  });

  test("resolves after a single setLanguage finishes loading", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("es");
    await languageChangeComplete();

    expect(getCurrentLanguage()!.fullLanguageName).toBe("spanish");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
  });

  test("burst: only resolves when the latest language has loaded", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    // english slow, spanish fast — but spanish is set last, so it should win.
    const loader = buildDelayedLoader(
      { english: 40, spanish: 5 },
      { english: { greet: "Hello", footer: "" }, spanish: { greet: "Hola", footer: "" } }
    );
    registerTranslations(FEATURE_MAIN, loader, { preloadTranslations: true });

    setLanguage("english");
    setLanguage("spanish");
    await languageChangeComplete();

    expect(getCurrentLanguage()!.fullLanguageName).toBe("spanish");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");

    // Wait for english loader (slower, non-latest) to settle before teardown.
    await waitForStaleLoaders(50);
  });

  test("burst: latest is the slowest one — promise waits for it (not for an earlier faster one)", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    const loader = buildDelayedLoader(
      { english: 5, spanish: 40 },
      { english: { greet: "Hello", footer: "" }, spanish: { greet: "Hola", footer: "" } }
    );
    registerTranslations(FEATURE_MAIN, loader, { preloadTranslations: true });

    setLanguage("english");
    setLanguage("spanish");
    const start = performance.now();
    await languageChangeComplete();
    const elapsed = performance.now() - start;

    expect(getCurrentLanguage()!.fullLanguageName).toBe("spanish");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
    // We waited for spanish (~40ms), not english (~5ms).
    expect(elapsed).toBeGreaterThanOrEqual(30);
  });

  test("burst with three rapid changes resolves only when the third one is loaded", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    const loader = buildDelayedLoader(
      { english: 30, spanish: 20, french: 10 },
      {
        english: { greet: "Hello", footer: "" },
        spanish: { greet: "Hola", footer: "" },
        french: { greet: "Bonjour", footer: "" }
      }
    );
    registerTranslations(FEATURE_MAIN, loader, { preloadTranslations: true });

    setLanguage("english");
    setLanguage("spanish");
    setLanguage("french");
    await languageChangeComplete();

    expect(getCurrentLanguage()!.fullLanguageName).toBe("french");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Bonjour");

    // english (30ms) and spanish (20ms) loaders are still pending — flush.
    await waitForStaleLoaders(40);
  });

  test("repeated calls during the same in-flight change return the same Promise", () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("es");
    const p1 = languageChangeComplete();
    const p2 = languageChangeComplete();

    expect(p1).toBe(p2);
  });

  test("after a change resolves, a subsequent setLanguage produces a fresh pending Promise", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("es");
    const firstPromise = languageChangeComplete();
    await firstPromise;

    setLanguage("english");
    const secondPromise = languageChangeComplete();

    expect(secondPromise).not.toBe(firstPromise);
    await secondPromise;
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
  });

  test("cached re-set: switching to a previously loaded language resolves on the next microtask without artificial delay", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("es");
    await languageChangeComplete();
    setLanguage("english");
    await languageChangeComplete();
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");

    // Spanish is now cached. Switching back should resolve on the next microtask.
    setLanguage("es");
    const start = performance.now();
    await languageChangeComplete();
    const elapsed = performance.now() - start;

    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
    // Generous bound — we just want to assert no artificial delay was introduced.
    expect(elapsed).toBeLessThan(20);
  });

  test("burst where the latest target is already cached still resolves to the latest language", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    const loader = buildDelayedLoader(
      { english: 40, spanish: 0 },
      { english: { greet: "Hello", footer: "" }, spanish: { greet: "Hola", footer: "" } }
    );
    registerTranslations(FEATURE_MAIN, loader, { preloadTranslations: true });

    // Prime the cache for spanish.
    setLanguage("spanish");
    await languageChangeComplete();

    // Now go to english (slow) then back to spanish (cached) in burst.
    setLanguage("english");
    setLanguage("spanish");
    await languageChangeComplete();

    expect(getCurrentLanguage()!.fullLanguageName).toBe("spanish");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");

    // english loader (40ms) is still in flight — flush.
    await waitForStaleLoaders(50);
  });

  test("called before any setLanguage resolves immediately (no pending change)", async () => {
    setPathname("/en/home");

    let resolved = false;
    languageChangeComplete().then(() => {
      resolved = true;
    });

    // One microtask is enough for an already-resolved Promise.
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  test("first language change also resolves languageChangeComplete (consistent with languageHasBeenInitialized)", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("en");
    await Promise.all([languageChangeComplete(), languageHasBeenInitialized()]);

    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");
  });

  test("subscribers have received the new translations by the time languageChangeComplete resolves", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }));

    const received: string[] = [];
    const id = subscribeToLanguageChanges(FEATURE_MAIN, t =>
      received.push((t as AppMainShape).greet)
    );
    trackSubscriber(id);

    setLanguage("english");
    await languageChangeComplete();

    setLanguage("spanish");
    await languageChangeComplete();

    expect(received).toContain("Hola");
    // The most recent notification matches the current language.
    expect(received[received.length - 1]).toBe("Hola");
  });

  test("burst then await — the resulting awaited language equals the latest setLanguage call", async () => {
    // Initial path uses a different language than the burst's last entry to
    // avoid the contrived case where the empty load of
    // `setInitialApplicationLanguage` (no features registered yet) happens
    // to target the same language as the latest burst call.
    setPathname("/de/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    const loader = buildDelayedLoader(
      { english: 25, spanish: 25, french: 25 },
      {
        english: { greet: "Hello", footer: "" },
        spanish: { greet: "Hola", footer: "" },
        french: { greet: "Bonjour", footer: "" }
      }
    );
    registerTranslations(FEATURE_MAIN, loader, { preloadTranslations: true });

    setLanguage("spanish");
    setLanguage("french");
    setLanguage("english");
    await languageChangeComplete();

    expect(getCurrentLanguage()!.fullLanguageName).toBe("english");
    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hello");

    // The two earlier loaders may still be in flight if their setTimeout
    // callbacks hadn't all fired by the time english's `.then()` ran — flush.
    await waitForStaleLoaders(30);
  });

  test("setting the same language twice in a row still resolves languageChangeComplete", async () => {
    setPathname("/en/home");
    setInitialApplicationLanguage({ locationChangeCallback: () => {} });
    registerTranslations(FEATURE_MAIN, createEnEsLoader({ greet: "Hello" }, { greet: "Hola" }), {
      preloadTranslations: true
    });

    setLanguage("es");
    setLanguage("es");
    await languageChangeComplete();

    expect(getCurrentTranslations<AppMainShape>(FEATURE_MAIN)!.greet).toBe("Hola");
  });
});
