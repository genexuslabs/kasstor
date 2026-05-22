import { registerDesignSystem } from "@genexus/kasstor-design-system";
import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";

import "../theme.lit.js";
import type { KstTheme } from "../theme.lit.js";
import type { ThemeModel } from "../types.js";
import {
  clearAllState,
  CSS_NAME,
  CSS_URL,
  EMPTY_ADOPTED_STYLESHEETS,
  expectThemeLoaded,
  getDocumentAdoptedStyleSheets,
  SCROLLBAR_CSS_SIGNATURE,
  setModelAndWait,
  TEST_DESIGN_SYSTEM,
  URL_NAME,
  URL_THEME_CSS_SIGNATURE,
  URL_THEME_URL,
  type EventSpy
} from "./test-utils.js";

describe("[kst-theme][attachStyleSheets]", () => {
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

  it("should attach the stylesheet by default (single theme)", async () => {
    await setModelAndWait(themeRef, CSS_NAME);

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);
  });

  it("should attach all stylesheets by default (multiple themes)", async () => {
    await setModelAndWait(themeRef, [CSS_NAME, URL_NAME]);

    expectThemeLoaded(
      themeLoadedSpy,
      [CSS_NAME, URL_NAME],
      [SCROLLBAR_CSS_SIGNATURE, URL_THEME_CSS_SIGNATURE]
    );
  });

  it('should not attach the stylesheet when "attachStyleSheetsDisabled = true" at load time', async () => {
    themeRef.attachStyleSheetsDisabled = true;
    await setModelAndWait(themeRef, CSS_NAME);

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME], []);
    expect(getDocumentAdoptedStyleSheets()).toEqual(EMPTY_ADOPTED_STYLESHEETS);
  });

  it('should not attach any stylesheet when "attachStyleSheetsDisabled = true" (multiple themes)', async () => {
    themeRef.attachStyleSheetsDisabled = true;
    await setModelAndWait(themeRef, [CSS_NAME, URL_NAME]);

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME, URL_NAME], []);
  });

  it("should not attach an item with attachStyleSheet: false (per-item override)", async () => {
    await setModelAndWait(themeRef, [
      { name: CSS_NAME, attachStyleSheet: false },
      { name: URL_NAME }
    ]);

    expectThemeLoaded(themeLoadedSpy, [CSS_NAME, URL_NAME], [URL_THEME_CSS_SIGNATURE]);
    const adopted = getDocumentAdoptedStyleSheets();
    expect(adopted.some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))).toBe(false);
  });

  // - - - - - - - - - - Reactive behavior - - - - - - - - - -

  const reactiveEnabledToDisabled = (model: ThemeModel, label: string) => {
    it(`attachStyleSheetsDisabled should be reactive: false -> true (${label})`, async () => {
      await setModelAndWait(themeRef, model);

      themeRef.attachStyleSheetsDisabled = true;
      await themeRef.updateComplete;

      expect(getDocumentAdoptedStyleSheets()).toEqual(EMPTY_ADOPTED_STYLESHEETS);
    });
  };
  reactiveEnabledToDisabled(CSS_NAME, "single theme");
  reactiveEnabledToDisabled([CSS_NAME, URL_NAME], "multiple themes");

  const reactiveDisabledToEnabled = (
    model: ThemeModel,
    label: string,
    expectedSuccess: string[],
    expectedSignatures: string[]
  ) => {
    it(`attachStyleSheetsDisabled should be reactive: true -> false (${label})`, async () => {
      themeRef.attachStyleSheetsDisabled = true;
      await setModelAndWait(themeRef, model);

      themeRef.attachStyleSheetsDisabled = false;
      await themeRef.updateComplete;

      expectThemeLoaded(themeLoadedSpy, expectedSuccess, expectedSignatures);
    });
  };
  reactiveDisabledToEnabled(CSS_NAME, "single theme", [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);
  reactiveDisabledToEnabled(
    [CSS_NAME, URL_NAME],
    "multiple themes",
    [CSS_NAME, URL_NAME],
    [SCROLLBAR_CSS_SIGNATURE, URL_THEME_CSS_SIGNATURE]
  );
});

