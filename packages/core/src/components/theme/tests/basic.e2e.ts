import { registerDesignSystem } from "@genexus/kasstor-design-system";
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
  delay,
  SCROLLBAR_CSS_SIGNATURE,
  setModelAndWait,
  TEST_DESIGN_SYSTEM,
  type ThemeLoadedEventDetail,
  waitForEvent
} from "./test-utils.js";

describe("[kst-theme][basic]", () => {
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

  it("should not have the hidden attribute set", () => {
    expect(themeRef.getAttribute("hidden")).toBeNull();
  });

  it("should render with display: contents", () => {
    expect(getComputedStyle(themeRef).display).toEqual("contents");
  });

  it("should not have Shadow DOM", () => {
    expect(themeRef.shadowRoot).toBeNull();
  });

  it('the "attachStyleSheetsDisabled" property should default to false', () => {
    expect(themeRef.attachStyleSheetsDisabled).toBe(false);
  });

  it('the "avoidFlashOfUnstyledContentDisabled" property should default to false', () => {
    expect(themeRef.avoidFlashOfUnstyledContentDisabled).toBe(false);
  });

  it('the "model" property should be undefined by default', () => {
    expect(themeRef.model).toBeUndefined();
  });

  it('the "loaded" state should default to false', () => {
    expect(themeRef.loaded).toBe(false);
  });

  it("should not fire themeLoaded when the model is undefined", async () => {
    const themeLoadedSpy = vi.fn<EventListener>();
    themeRef.addEventListener("themeLoaded", themeLoadedSpy);
    await delay(100);
    expect(themeLoadedSpy).not.toHaveBeenCalled();
  });

  it("should not throw when the model is undefined", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
    await delay(100);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should not fire themeLoaded when the model is an empty array", async () => {
    const themeLoadedSpy = vi.fn<EventListener>();
    themeRef.addEventListener("themeLoaded", themeLoadedSpy);

    themeRef.model = [];
    await themeRef.updateComplete;
    await delay(50);

    // `#loadModel` returns early on `actualModel.length === 0`, so no
    // themeLoaded event is fired.
    expect(themeLoadedSpy).not.toHaveBeenCalled();
  });

  it("should fire themeLoaded when the model resolves successfully", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    const event = await setModelAndWait(themeRef, CSS_NAME);

    expect(event.detail.success).toEqual([CSS_NAME]);
    expect(event.detail.failed).toEqual([]);
    expect(themeRef.loaded).toBe(true);
  });

  it("should report a failed theme when no loader is registered for the name", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    // Pre-warm the promise info with a short timeout so the test does not
    // need to wait the default 10 s. `getStyleSheetPromiseInfo` caches the
    // entry by name, so the component's later call returns the same instance.
    getStyleSheetPromiseInfo("unknown-bundle", 200);

    const eventPromise = waitForEvent<ThemeLoadedEventDetail>(themeRef, "themeLoaded");
    themeRef.model = "unknown-bundle";
    const event = await eventPromise;

    expect(event.detail.success).toEqual([]);
    expect(event.detail.failed).toEqual(["unknown-bundle"]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should adopt the stylesheet into the document when connected to it", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    await setModelAndWait(themeRef, CSS_NAME);

    const adopted = document.adoptedStyleSheets.map(s =>
      [...s.cssRules].map(r => r.cssText).join("\n")
    );
    expect(adopted.some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))).toBe(true);
  });

  it("should adopt the stylesheet into the ShadowRoot when connected to it", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    const shadowHost = document.createElement("div");
    document.body.appendChild(shadowHost);
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    const shadowTheme = document.createElement("kst-theme") as KstTheme;
    shadowRoot.appendChild(shadowTheme);
    await shadowTheme.updateComplete;

    await setModelAndWait(shadowTheme, CSS_NAME);

    const adopted = shadowRoot.adoptedStyleSheets.map(s =>
      [...s.cssRules].map(r => r.cssText).join("\n")
    );
    expect(adopted.some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))).toBe(true);

    shadowHost.remove();
  });

  it("should detach the stylesheet when the last referencing kst-theme disconnects", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    await setModelAndWait(themeRef, CSS_NAME);
    themeRef.remove();

    const afterDisconnect = document.adoptedStyleSheets.map(s =>
      [...s.cssRules].map(r => r.cssText).join("\n")
    );
    expect(afterDisconnect.some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))).toBe(false);
  });

  it("should keep the stylesheet adopted when one kst-theme disconnects but another still references it", async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: { [CSS_NAME]: CSS_URL }
    });

    const secondTheme = document.createElement("kst-theme") as KstTheme;
    document.body.appendChild(secondTheme);
    await secondTheme.updateComplete;

    await setModelAndWait(themeRef, CSS_NAME);
    await setModelAndWait(secondTheme, CSS_NAME);

    themeRef.remove();

    expect(
      document.adoptedStyleSheets
        .map(s => [...s.cssRules].map(r => r.cssText).join("\n"))
        .some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))
    ).toBe(true);

    secondTheme.remove();
  });
});

