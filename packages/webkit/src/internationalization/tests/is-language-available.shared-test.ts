/**
 * Tests for `isLanguageAvailable`. Reads from globals; cleans up after each
 * test. Runs in both Node and Browser projects.
 */

import { afterEach, describe, expect, test } from "vitest";
import { isLanguageAvailable } from "../is-language-available.js";

const resetGlobals = () => {
  delete (globalThis as unknown as { kasstorWebkitI18n?: unknown }).kasstorWebkitI18n;
};

describe("[isLanguageAvailable]", () => {
  afterEach(() => {
    resetGlobals();
  });

  test("returns true for any subtag when availableLanguages is undefined (legacy mode)", () => {
    expect(isLanguageAvailable("en")).toBe(true);
    expect(isLanguageAvailable("es")).toBe(true);
    expect(isLanguageAvailable("ja")).toBe(true);
  });

  test("returns true only for subtags in the configured set", () => {
    // Trigger initialization of globals via the helper itself.
    isLanguageAvailable("en");
    kasstorWebkitI18n!.availableLanguages = new Set(["en", "es"]);

    expect(isLanguageAvailable("en")).toBe(true);
    expect(isLanguageAvailable("es")).toBe(true);
    expect(isLanguageAvailable("fr")).toBe(false);
    expect(isLanguageAvailable("ja")).toBe(false);
  });
});
