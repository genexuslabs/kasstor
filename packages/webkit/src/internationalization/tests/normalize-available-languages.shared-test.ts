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

  test("normalizes full names to subtags", () => {
    const set = normalizeAvailableLanguages(["spanish", "english"]);
    expect(set.has("es")).toBe(true);
    expect(set.has("en")).toBe(true);
    expect(set.size).toBe(2);
  });

  test("accepts mixed subtags and full names", () => {
    const set = normalizeAvailableLanguages(["spanish", "en", "french"]);
    expect(set.has("es")).toBe(true);
    expect(set.has("en")).toBe(true);
    expect(set.has("fr")).toBe(true);
  });

  test("deduplicates entries", () => {
    const set = normalizeAvailableLanguages(["es", "spanish", "es", "en"]);
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
});
