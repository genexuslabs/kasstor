import { registerDesignSystem } from "@genexus/kasstor-design-system";
import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import "../theme.lit.js";

import type { KstTheme } from "../theme.lit.js";
import type { ThemeModel } from "../types.js";
import {
  clearAllState,
  CSS_NAME,
  CSS_URL,
  setModelAndWait,
  TEST_DESIGN_SYSTEM
} from "./test-utils.js";

const LOADING_ATTRIBUTE = "data-kst-theme-loading";

const EXPECTED_FOUC_CSS = `:host,:has(>kst-theme[${LOADING_ATTRIBUTE}]){visibility:hidden !important}`;

describe("[kst-theme][style]", () => {
  let themeRef: KstTheme;

  beforeEach(async () => {
    render(html`<kst-theme></kst-theme>`);
    themeRef = document.querySelector("kst-theme")! as KstTheme;
    await themeRef.updateComplete;
  });

  afterEach(() => {
    cleanup();
    clearAllState();
    document.adoptedStyleSheets = [];
  });

  // `model` values that do not trigger an async load so the FOUC style stays
  // rendered. `""` / `"dummy"` would start a real registry lookup and time
  // out 10 s later — covered separately below.
  const NON_LOADING_MODELS: { model: undefined | null | ThemeModel; label: string }[] = [
    { model: undefined, label: "model = undefined" },
    { model: null, label: "model = null" },
    { model: [], label: "model = []" }
  ];

  for (const { model, label } of NON_LOADING_MODELS) {
    it(`should hide the root node while loading (avoidFlashOfUnstyledContentDisabled = false, ${label})`, async () => {
      themeRef.model = model;
      await themeRef.updateComplete;

      const styleEl = themeRef.querySelector("style");
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain(EXPECTED_FOUC_CSS);

      const root = themeRef.parentElement!;
      expect(root).not.toBeNull();
      expect(getComputedStyle(root).visibility).toBe("hidden");
    });

    it(`should NOT hide the root node when avoidFlashOfUnstyledContentDisabled = true (${label})`, async () => {
      themeRef.avoidFlashOfUnstyledContentDisabled = true;
      themeRef.model = model;
      await themeRef.updateComplete;

      expect(themeRef.querySelector("style")).toBeNull();

      const root = themeRef.parentElement!;
      expect(root).not.toBeNull();
      expect(getComputedStyle(root).visibility).toBe("visible");
    });
  }

  it(`should set the "${LOADING_ATTRIBUTE}" attribute on connect`, () => {
    expect(themeRef.getAttribute(LOADING_ATTRIBUTE)).toEqual("");
  });

  it(`should remove the "${LOADING_ATTRIBUTE}" attribute after themes are loaded`, async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    await setModelAndWait(themeRef, CSS_NAME);

    expect(themeRef.getAttribute(LOADING_ATTRIBUTE)).toBeNull();
  });

  it("should remove the FOUC style after themes are loaded", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    await setModelAndWait(themeRef, CSS_NAME);
    await themeRef.updateComplete;

    expect(themeRef.querySelector("style")).toBeNull();
  });

  it("should make the root node visible after themes are loaded", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    await setModelAndWait(themeRef, CSS_NAME);
    await themeRef.updateComplete;

    expect(getComputedStyle(themeRef.parentElement!).visibility).toBe("visible");
  });
});

