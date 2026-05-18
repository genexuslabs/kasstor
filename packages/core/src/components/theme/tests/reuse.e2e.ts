import { registerDesignSystem } from "@genexus/kasstor-design-system";
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
  getDocumentAdoptedStyleSheets,
  getRootAdoptedStyleSheets,
  SCROLLBAR_CSS_SIGNATURE,
  setModelAndWait,
  TEST_DESIGN_SYSTEM,
  URL_NAME,
  URL_THEME_CSS_SIGNATURE,
  URL_THEME_URL,
  type EventSpy
} from "./test-utils.js";

describe("[kst-theme][reuse]", () => {
  let theme1Ref: KstTheme;
  let theme2Ref: KstTheme;
  let themeLoaded1Spy: EventSpy;
  let themeLoaded2Spy: EventSpy;

  beforeEach(async () => {
    registerDesignSystem(TEST_DESIGN_SYSTEM, {
      bundleLoaders: {
        [CSS_NAME]: CSS_URL,
        [URL_NAME]: URL_THEME_URL
      }
    });

    render(html`
      <kst-theme id="theme-a"></kst-theme>
      <kst-theme id="theme-b"></kst-theme>
    `);
    theme1Ref = document.querySelector("[id='theme-a']")! as KstTheme;
    theme2Ref = document.querySelector("[id='theme-b']")! as KstTheme;
    await theme1Ref.updateComplete;
    await theme2Ref.updateComplete;

    themeLoaded1Spy = vi.fn<EventListener>();
    themeLoaded2Spy = vi.fn<EventListener>();
    theme1Ref.addEventListener("themeLoaded", themeLoaded1Spy);
    theme2Ref.addEventListener("themeLoaded", themeLoaded2Spy);
  });

  afterEach(() => {
    cleanup();
    clearAllState();
    document.adoptedStyleSheets = [];
  });

  it("should adopt the union of stylesheets when two kst-theme load different bundles in the same root", async () => {
    await setModelAndWait(theme1Ref, CSS_NAME);
    expectThemeLoaded(themeLoaded1Spy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);

    await setModelAndWait(theme2Ref, URL_NAME);
    expectThemeLoaded(
      themeLoaded2Spy,
      [URL_NAME],
      [SCROLLBAR_CSS_SIGNATURE, URL_THEME_CSS_SIGNATURE]
    );
  });

  it("should reuse the cached stylesheet for a name that was already loaded by another kst-theme (same root)", async () => {
    await setModelAndWait(theme1Ref, CSS_NAME);
    expectThemeLoaded(themeLoaded1Spy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);

    // Second loads the same name — should resolve from cache without a new fetch
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await setModelAndWait(theme2Ref, CSS_NAME);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    expectThemeLoaded(themeLoaded2Spy, [CSS_NAME], [SCROLLBAR_CSS_SIGNATURE]);
  });

  it("should adopt a cached stylesheet into a ShadowRoot when referenced by name only (different root)", async () => {
    // First load: populate the document-level cache and adoption.
    await setModelAndWait(theme1Ref, CSS_NAME);

    const shadowHost = document.createElement("div");
    document.body.appendChild(shadowHost);
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    const shadowTheme = document.createElement("kst-theme") as KstTheme;
    shadowRoot.appendChild(shadowTheme);
    await shadowTheme.updateComplete;

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await setModelAndWait(shadowTheme, CSS_NAME);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    expect(
      getRootAdoptedStyleSheets(shadowRoot).some(css => css.includes(SCROLLBAR_CSS_SIGNATURE))
    ).toBe(true);

    shadowHost.remove();
  });

  it("should adopt a single CSSStyleSheet only once in the document even when both components reference it", async () => {
    await setModelAndWait(theme1Ref, CSS_NAME);
    await setModelAndWait(theme2Ref, CSS_NAME);

    const matching = getDocumentAdoptedStyleSheets().filter(css =>
      css.includes(SCROLLBAR_CSS_SIGNATURE)
    );
    expect(matching).toHaveLength(1);
  });
});

