/**
 * Tests for `isLanguageAvailable`. Reads from globals; cleans up after each
 * test. Runs in both Node and Browser projects.
 *
 * The function uses two Sets (`availableLanguages` for exact match,
 * `availableBaseSubtags` for wildcard-by-base) and `applyI18nConfig` keeps
 * them in sync. Tests go through `setAvailableLanguages` (the public API)
 * so the base-subtag index is built the same way production builds it.
 */

import { afterEach, describe, expect, test } from "vitest";
import { isLanguageAvailable } from "../is-language-available.js";
import { setAvailableLanguages } from "../set-available-languages.js";

const resetGlobals = () => {
  delete (globalThis as unknown as { kasstorWebkitI18n?: unknown })
    .kasstorWebkitI18n;
};

describe("[isLanguageAvailable]", () => {
  afterEach(() => {
    resetGlobals();
  });

  describe("legacy mode (no availableLanguages configured)", () => {
    test("returns true for every tag", () => {
      expect(isLanguageAvailable("en")).toBe(true);
      expect(isLanguageAvailable("es")).toBe(true);
      expect(isLanguageAvailable("nl-NL")).toBe(true);
      expect(isLanguageAvailable("klingon" as never)).toBe(true);
    });
  });

  describe("exact match", () => {
    test("returns true for a tag listed verbatim", () => {
      setAvailableLanguages({
        availableLanguages: ["en", "es"],
        strict: true
      });
      expect(isLanguageAvailable("en")).toBe(true);
      expect(isLanguageAvailable("es")).toBe(true);
    });

    test("returns false for a tag not listed (and base not shared)", () => {
      setAvailableLanguages({
        availableLanguages: ["en", "es"],
        strict: true
      });
      expect(isLanguageAvailable("fr")).toBe(false);
      expect(isLanguageAvailable("ja")).toBe(false);
    });
  });

  describe("wildcard-by-base (base-subtag index)", () => {
    test("['es'] accepts every 'es-*' region variant", () => {
      setAvailableLanguages({
        availableLanguages: ["es"],
        strict: true
      });
      expect(isLanguageAvailable("es")).toBe(true);
      expect(isLanguageAvailable("es-AR")).toBe(true);
      expect(isLanguageAvailable("es-ES")).toBe(true);
      expect(isLanguageAvailable("es-MX")).toBe(true);
    });

    test("['es-AR'] accepts the bare 'es' and other 'es-*' variants", () => {
      setAvailableLanguages({
        availableLanguages: ["es-AR"],
        strict: true
      });
      expect(isLanguageAvailable("es-AR")).toBe(true);
      expect(isLanguageAvailable("es")).toBe(true);
      expect(isLanguageAvailable("es-ES")).toBe(true);
    });

    test("['es', 'es-ES'] still respects exact and base-share", () => {
      setAvailableLanguages({
        availableLanguages: ["es", "es-ES"],
        strict: true
      });
      expect(isLanguageAvailable("es")).toBe(true);
      expect(isLanguageAvailable("es-ES")).toBe(true);
      expect(isLanguageAvailable("es-AR")).toBe(true); // shares base
      expect(isLanguageAvailable("fr")).toBe(false);
    });

    test("a different base subtag is rejected", () => {
      setAvailableLanguages({
        availableLanguages: ["es-AR"],
        strict: true
      });
      expect(isLanguageAvailable("fr")).toBe(false);
      expect(isLanguageAvailable("fr-FR")).toBe(false);
      expect(isLanguageAvailable("en")).toBe(false);
    });
  });

  describe("arbitrary subtags outside the well-known set", () => {
    test("a host-declared 'nl' accepts 'nl-NL' and 'nl-BE'", () => {
      setAvailableLanguages({
        availableLanguages: ["nl"],
        strict: true
      });
      expect(isLanguageAvailable("nl")).toBe(true);
      expect(isLanguageAvailable("nl-NL")).toBe(true);
      expect(isLanguageAvailable("nl-BE")).toBe(true);
    });

    test("a host-declared 'he-IL' accepts the bare 'he'", () => {
      setAvailableLanguages({
        availableLanguages: ["he-IL"],
        strict: true
      });
      expect(isLanguageAvailable("he-IL")).toBe(true);
      expect(isLanguageAvailable("he")).toBe(true);
      expect(isLanguageAvailable("he-US")).toBe(true);
    });
  });
});
