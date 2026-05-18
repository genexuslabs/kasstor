// Side-effect import so the ambient `globalThis.geneXusDesignSystems*`
// declarations contributed by `@genexus/kasstor-design-system` are in scope
// for the `clearAllState` helper below.
import "@genexus/kasstor-design-system";
import { expect, type Mock } from "vitest";

import type { KstTheme } from "../theme.lit.js";
import type { ThemeModel } from "../types.js";

import scrollbarCssText from "./fixtures/showcase/scrollbar.css?raw";
import themeTestCssText from "./fixtures/showcase/theme-test.css?raw";

export type EventSpy = Mock<EventListener>;

export type ThemeLoadedEventDetail = { success: string[]; failed: string[] };

// - - - - - - - - - - Fixture URLs and names - - - - - - - - - -

export const TEST_DESIGN_SYSTEM = "test-ds";

// Vite serves bare `.css` files as JS modules with HMR/style-injection
// wrappers, so fetching them directly does not return the raw CSS. Inline
// the fixture content via `?raw` imports and expose it as a `blob:` URL —
// this works identically whether the tests run from the package or from
// the monorepo root, regardless of `vitest.config.ts`.
const toBlobUrl = (css: string) => URL.createObjectURL(new Blob([css], { type: "text/css" }));

export const CSS_NAME = "chameleon/scrollbar";
export const CSS_URL = toBlobUrl(scrollbarCssText);

export const URL_NAME = "test-urls";
export const URL_THEME_URL = toBlobUrl(themeTestCssText);

// Expected stylesheet contents after fetch + CSSStyleSheet round-trip.
// `replaceSync` re-serializes via `cssRules`, so the exact spacing matches what
// the browser produces, not the source file. Verify with substring checks.
export const SCROLLBAR_CSS_SIGNATURE = ":host(.ch-scrollable)";
export const URL_THEME_CSS_SIGNATURE = ".rule-1";

export const EMPTY_ADOPTED_STYLESHEETS: string[] = [];

// - - - - - - - - - - Registry helpers - - - - - - - - - -

/**
 * Wipes every piece of state held by `@genexus/kasstor-design-system` on
 * `globalThis` (registered systems, bundle loaders, cached stylesheets and
 * in-flight theme promises) so each test starts from a clean slate. Call
 * from `afterEach` together with `cleanup()` and resetting
 * `document.adoptedStyleSheets`.
 *
 * The design-system intentionally does NOT export a public reset API; tests
 * lean on the fact that all of its caches live under `globalThis` for that
 * reason.
 */
export const clearAllState = () => {
  globalThis.geneXusDesignSystemsRegistry?.clear();
  globalThis.geneXusDesignSystemsLoaders?.clear();
  globalThis.geneXusDesignSystemsStyleSheets?.clear();
  globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
};

// - - - - - - - - - - Event helpers - - - - - - - - - -

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForEvent = <T>(el: HTMLElement, eventName: string): Promise<CustomEvent<T>> =>
  new Promise(resolve =>
    el.addEventListener(eventName, e => resolve(e as CustomEvent<T>), { once: true })
  );

/**
 * Assigns `model` to the element and resolves with the next `themeLoaded`
 * event. The listener is attached **before** the assignment so synchronous
 * resolutions (cached models) are still observed.
 */
export const setModelAndWait = async (el: KstTheme, model: ThemeModel) => {
  const eventPromise = waitForEvent<ThemeLoadedEventDetail>(el, "themeLoaded");
  el.model = model;
  return eventPromise;
};

// - - - - - - - - - - Adopted-stylesheet helpers - - - - - - - - - -

// The kst-theme component (shadow: false) always adopts its own SCSS as a
// global stylesheet. Filter it out so tests only assert on theme stylesheets.
const COMPONENT_OWN_STYLE = "kst-theme { display: contents; }";

const stylesheetToCss = (stylesheet: CSSStyleSheet): string =>
  [...stylesheet.cssRules].map(rule => rule.cssText).join("\n");

const isThemeStylesheet = (css: string) => css !== COMPONENT_OWN_STYLE;

export const getDocumentAdoptedStyleSheets = () =>
  document.adoptedStyleSheets.map(stylesheetToCss).filter(isThemeStylesheet);

export const getRootAdoptedStyleSheets = (root: Document | ShadowRoot) =>
  root.adoptedStyleSheets.map(stylesheetToCss).filter(isThemeStylesheet);

/**
 * Asserts that the `themeLoaded` event fired once with the given `success`
 * names and that the document has adopted stylesheets matching the supplied
 * substrings (each substring must be present in at least one adopted sheet).
 */
export const expectThemeLoaded = (
  spy: EventSpy,
  expectedSuccess: string[],
  expectedSheetSignatures: string[]
) => {
  expect(spy).toHaveBeenCalledTimes(1);
  const detail = (spy.mock.calls[0][0] as CustomEvent<ThemeLoadedEventDetail>).detail;
  expect(detail.success.toSorted()).toEqual(expectedSuccess.toSorted());

  const adoptedCss = getDocumentAdoptedStyleSheets();
  for (const signature of expectedSheetSignatures) {
    expect(adoptedCss.some(css => css.includes(signature))).toBe(true);
  }
  if (expectedSheetSignatures.length === 0) {
    expect(adoptedCss).toEqual(EMPTY_ADOPTED_STYLESHEETS);
  }
};

