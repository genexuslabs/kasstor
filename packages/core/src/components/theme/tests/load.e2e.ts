import { registerDesignSystem } from "@genexus/kasstor-design-system";
import { getLoadedStyleSheet } from "@genexus/kasstor-design-system/get-loaded-style-sheet.js";
import { getStyleSheetPromiseInfo } from "@genexus/kasstor-design-system/get-style-sheet-promise-info.js";
import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";

import "../theme.lit.js";
import type { KstTheme } from "../theme.lit.js";
import {
  clearAllState,
  CSS_NAME,
  CSS_URL,
  expectThemeLoaded,
  SCROLLBAR_CSS_SIGNATURE,
  setModelAndWait,
  TEST_DESIGN_SYSTEM,
  URL_NAME,
  URL_THEME_CSS_SIGNATURE,
  URL_THEME_URL,
  type EventSpy
} from "./test-utils.js";

describe("[kst-theme][load]", () => {
  let themeRef: KstTheme;
  let themeLoadedSpy: EventSpy;

  beforeEach(async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: {
        [CSS_NAME]: CSS_URL,
        [URL_NAME]: URL_THEME_URL
      }
    });

    render(html`<kst-theme></kst-theme>`);
    themeRef = document.querySelector("kst-theme")! as KstTheme;
    await themeRef.updateComplete;

    themeLoadedSpy = vi.fn<EventListener>();
    themeRef.addEventListener("themeLoaded", themeLoadedSpy);
  });

  afterEach(() => {
    cleanup();
    clearAllState();
    document.adoptedStyleSheets = [];
  });

  it("should load a single theme by name", async () => {
    await setModelAndWait(themeRef, CSS_NAME);

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);
  });

  it("should load a single theme passed as a ThemeItemModel", async () => {
    await setModelAndWait(themeRef, { name: CSS_NAME });

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);
  });

  it("should load multiple themes passed as an array of names", async () => {
    await setModelAndWait(themeRef, [CSS_NAME, URL_NAME]);

    expectThemeLoaded(
      themeLoadedSpy,
      [CSS_NAME, URL_NAME],
      [SCROLLBAR_CSS_SIGNATURE, URL_THEME_CSS_SIGNATURE]
    );
  });

  it("should load multiple themes passed as an array of ThemeItemModel objects", async () => {
    await setModelAndWait(themeRef, [{ name: CSS_NAME }, { name: URL_NAME }]);

    expectThemeLoaded(
      themeLoadedSpy,
      [CSS_NAME, URL_NAME],
      [SCROLLBAR_CSS_SIGNATURE, URL_THEME_CSS_SIGNATURE]
    );
  });

  it("should cache the parsed CSSStyleSheet under the theme name", async () => {
    await setModelAndWait(themeRef, CSS_NAME);

    const cached = getLoadedStyleSheet(CSS_NAME);
    expect(cached).toBeInstanceOf(CSSStyleSheet);
    const css = [...cached!.cssRules].map(r => r.cssText).join("\n");
    expect(css).toContain(SCROLLBAR_CSS_SIGNATURE);
  });

  it("should reuse the cached CSSStyleSheet across components without re-fetching", async () => {
    await setModelAndWait(themeRef, CSS_NAME);

    const firstCached = getLoadedStyleSheet(CSS_NAME);
    expect(firstCached).toBeInstanceOf(CSSStyleSheet);

    // Wrap fetch to assert it is not called when reusing
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const secondTheme = document.createElement("kst-theme") as KstTheme;
    document.body.appendChild(secondTheme);
    await secondTheme.updateComplete;
    await setModelAndWait(secondTheme, CSS_NAME);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getLoadedStyleSheet(CSS_NAME)).toBe(firstCached);

    fetchSpy.mockRestore();
    secondTheme.remove();
  });

  it("should partially succeed when some themes are unknown to the registry", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    // Pre-warm with a short timeout so the unknown bundle fails fast.
    getStyleSheetPromiseInfo("unknown-bundle", 200);

    await setModelAndWait(themeRef, [CSS_NAME, "unknown-bundle"]);

    expect(themeLoadedSpy).toHaveBeenCalledTimes(1);
    const detail = (
      themeLoadedSpy.mock.calls[0][0] as CustomEvent<{
        success: string[];
        failed: string[];
      }>
    ).detail;
    expect(detail.success.toSorted()).toEqual([CSS_NAME].toSorted());
    expect(detail.failed).toEqual(["unknown-bundle"]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should not fetch the same theme twice while a fetch is already in-flight", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Create a second consumer of the same name BEFORE the first one resolves
    const secondTheme = document.createElement("kst-theme") as KstTheme;
    document.body.appendChild(secondTheme);
    await secondTheme.updateComplete;

    themeRef.model = CSS_NAME;
    secondTheme.model = CSS_NAME;

    await Promise.all([themeRef.updateComplete, secondTheme.updateComplete]);

    // The in-flight dedupe (`promiseInfo.isDownloading`) should cause exactly
    // one fetch for the shared bundle — the second consumer attaches to the
    // same in-flight promise instead of starting a new request.
    const fetchCallsForBundle = fetchSpy.mock.calls.filter(([url]) => url === CSS_URL);
    expect(fetchCallsForBundle).toHaveLength(1);

    fetchSpy.mockRestore();
    secondTheme.remove();
  });
});

