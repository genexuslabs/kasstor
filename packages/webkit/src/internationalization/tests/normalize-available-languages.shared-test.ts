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
    const set = normalizeAvailableLanguages(["es", "en"]);
    expect(set).toBeInstanceOf(Set);
    expect(set.has("es")).toBe(true);
    expect(set.has("en")).toBe(true);
    expect(set.size).toBe(2);
  });

  test("deduplicates entries", () => {
    const set = normalizeAvailableLanguages(["es", "es", "en"]);
    expect(set.size).toBe(2);
  });

  test("empty input falls back to ['en'] with warn", () => {
    const set = normalizeAvailableLanguages([]);
    expect(set.size).toBe(1);
    expect(set.has("en")).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("missing 'en' is auto-added with warn", () => {
    const set = normalizeAvailableLanguages(["es", "fr"]);
    expect(set.has("es")).toBe(true);
    expect(set.has("fr")).toBe(true);
    expect(set.has("en")).toBe(true);
    expect(set.size).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("input with 'en' does not emit a warn", () => {
    normalizeAvailableLanguages(["es", "en"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("invalid entries are dropped with warn (and 'en' added if needed)", () => {
    // @ts-expect-error — exercising runtime-only validation
    const set = normalizeAvailableLanguages(["es", "xx", "klingon"]);
    expect(set.has("es")).toBe(true);
    expect(set.has("en")).toBe(true);
    expect(set.has("xx" as never)).toBe(false);
    // 2 invalid entries + 1 "en added" warn = 3 warns
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  test("only invalid entries falls back to ['en'] with warn(s)", () => {
    // @ts-expect-error — exercising runtime-only validation
    const set = normalizeAvailableLanguages(["xx", "klingon"]);
    expect(set.size).toBe(1);
    expect(set.has("en")).toBe(true);
  });

  // ─── strict mode ─────────────────────────────────────────────────────────
  // When `strict` is `true`, the function honors the input verbatim: the
  // safety fallback that auto-adds "en" is skipped, and an empty/all-invalid
  // input legitimately produces an empty Set.

  test("strict: does not auto-add 'en' when the input excludes it", () => {
    const set = normalizeAvailableLanguages(["es", "fr"], true);
    expect(set.has("es")).toBe(true);
    expect(set.has("fr")).toBe(true);
    expect(set.has("en")).toBe(false);
    expect(set.size).toBe(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("strict: respects an empty input verbatim (no fallback)", () => {
    const set = normalizeAvailableLanguages([], true);
    expect(set.size).toBe(0);
    // No safety-fallback warn is emitted because strict opted out of it.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("strict: keeps 'en' when the host explicitly included it", () => {
    const set = normalizeAvailableLanguages(["en", "es"], true);
    expect(set.has("en")).toBe(true);
    expect(set.has("es")).toBe(true);
    expect(set.size).toBe(2);
  });

  test("strict: still drops unsupported entries with a warn", () => {
    const set = normalizeAvailableLanguages(
      // @ts-expect-error — exercising runtime-only validation
      ["es", "xx", "fr"],
      true
    );
    expect(set.has("es")).toBe(true);
    expect(set.has("fr")).toBe(true);
    expect(set.has("xx" as never)).toBe(false);
    expect(set.has("en")).toBe(false); // strict: not auto-added even after dropping invalid
    expect(warnSpy).toHaveBeenCalledTimes(1); // only the "xx" drop warn
  });

  test("strict: defaults to non-strict (false) when omitted", () => {
    // Same as historical behavior — auto-adds "en".
    const set = normalizeAvailableLanguages(["es"]);
    expect(set.has("en")).toBe(true);
    expect(set.has("es")).toBe(true);
  });
});
