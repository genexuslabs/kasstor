/**
 * Tests for `normalizeAvailableLanguages`. Pure helper: no globals, no
 * window — runs in both Node and Browser projects.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { normalizeAvailableLanguages } from "../normalize-available-languages.js";

describe("[normalizeAvailableLanguages]", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("normalizes subtags as-is", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages(["es", "en"]);
    expect(languages).toBeInstanceOf(Set);
    expect(languages.has("es")).toBe(true);
    expect(languages.has("en")).toBe(true);
    expect(languages.size).toBe(2);
    // Base-subtag index mirrors the canonical entries when none are regional.
    expect(baseSubtags.has("es")).toBe(true);
    expect(baseSubtags.has("en")).toBe(true);
    expect(baseSubtags.size).toBe(2);
  });

  test("deduplicates entries", () => {
    const { languages } = normalizeAvailableLanguages(["es", "es", "en"]);
    expect(languages.size).toBe(2);
  });

  test("derives base subtags from regional entries (wildcard-by-base index)", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages([
      "en",
      "es-AR",
      "es-ES"
    ]);
    expect(languages.has("en")).toBe(true);
    expect(languages.has("es-AR")).toBe(true);
    expect(languages.has("es-ES")).toBe(true);
    expect(languages.size).toBe(3);
    // Both regional entries share the same base, so the index has one "es".
    expect(baseSubtags.has("en")).toBe(true);
    expect(baseSubtags.has("es")).toBe(true);
    expect(baseSubtags.size).toBe(2);
  });

  test("empty input falls back to ['en'] with warn", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages([]);
    expect(languages.size).toBe(1);
    expect(languages.has("en")).toBe(true);
    expect(baseSubtags.has("en")).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("missing 'en' is auto-added with warn", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages(["es", "fr"]);
    expect(languages.has("es")).toBe(true);
    expect(languages.has("fr")).toBe(true);
    expect(languages.has("en")).toBe(true);
    expect(languages.size).toBe(3);
    expect(baseSubtags.has("en")).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("input with 'en' does not emit a warn", () => {
    normalizeAvailableLanguages(["es", "en"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("regional 'en-US' counts as English base and skips the auto-add warn", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages([
      "en-US",
      "es"
    ]);
    expect(languages.has("en-US")).toBe(true);
    expect(languages.has("es")).toBe(true);
    expect(languages.has("en")).toBe(false); // not auto-added: base "en" is already present via "en-US"
    expect(baseSubtags.has("en")).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("structurally-invalid entries are dropped with warn (and 'en' added if needed)", () => {
    // Under the open-universe model, "xx" is structurally valid (2 letters)
    // so it is kept; only entries that fail BCP47 base grammar are dropped.
    // "klingon" (7 chars) and "engl" (4 chars) both fail and produce warns.
    const { languages } = normalizeAvailableLanguages(["es", "klingon", "engl"]);
    expect(languages.has("es")).toBe(true);
    expect(languages.has("en")).toBe(true);
    expect(languages.has("klingon" as never)).toBe(false);
    expect(languages.has("engl" as never)).toBe(false);
    // 2 invalid drop warns + 1 "en added" warn = 3 warns
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  test("accepts open-universe valid subtags (e.g. 'nl', 'he')", () => {
    const { languages } = normalizeAvailableLanguages(["es", "nl", "he"]);
    expect(languages.has("es")).toBe(true);
    expect(languages.has("nl")).toBe(true);
    expect(languages.has("he")).toBe(true);
    expect(languages.has("en")).toBe(true); // safety fallback
  });

  test("only structurally-invalid entries falls back to ['en'] with warn(s)", () => {
    const { languages } = normalizeAvailableLanguages(["klingon", "engl"]);
    expect(languages.size).toBe(1);
    expect(languages.has("en")).toBe(true);
  });

  // ─── strict mode ─────────────────────────────────────────────────────────
  // When `strict` is `true`, the function honors the input verbatim: the
  // safety fallback that auto-adds "en" is skipped, and an empty/all-invalid
  // input legitimately produces an empty Set.

  test("strict: does not auto-add 'en' when the input excludes it", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages(
      ["es", "fr"],
      true
    );
    expect(languages.has("es")).toBe(true);
    expect(languages.has("fr")).toBe(true);
    expect(languages.has("en")).toBe(false);
    expect(languages.size).toBe(2);
    expect(baseSubtags.has("en")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("strict: respects an empty input verbatim (no fallback)", () => {
    const { languages, baseSubtags } = normalizeAvailableLanguages([], true);
    expect(languages.size).toBe(0);
    expect(baseSubtags.size).toBe(0);
    // No safety-fallback warn is emitted because strict opted out of it.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("strict: keeps 'en' when the host explicitly included it", () => {
    const { languages } = normalizeAvailableLanguages(["en", "es"], true);
    expect(languages.has("en")).toBe(true);
    expect(languages.has("es")).toBe(true);
    expect(languages.size).toBe(2);
  });

  test("strict: still drops structurally-invalid entries with a warn", () => {
    const { languages } = normalizeAvailableLanguages(
      // "klingon" fails BCP47 base grammar (7 chars). "xx" passes
      // (2 chars) under the open-universe model so it is kept.
      ["es", "klingon", "fr"],
      true
    );
    expect(languages.has("es")).toBe(true);
    expect(languages.has("fr")).toBe(true);
    expect(languages.has("klingon" as never)).toBe(false);
    expect(languages.has("en")).toBe(false); // strict: not auto-added even after dropping invalid
    expect(warnSpy).toHaveBeenCalledTimes(1); // only the "klingon" drop warn
  });

  test("strict: defaults to non-strict (false) when omitted", () => {
    // Same as historical behavior — auto-adds "en".
    const { languages } = normalizeAvailableLanguages(["es"]);
    expect(languages.has("en")).toBe(true);
    expect(languages.has("es")).toBe(true);
  });
});
