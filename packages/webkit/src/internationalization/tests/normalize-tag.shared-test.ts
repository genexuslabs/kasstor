/**
 * Tests for `normalizeTag`. Pure helper: no globals, no window — runs in both
 * Node and Browser projects.
 */

import { describe, expect, test } from "vitest";
import { normalizeTag } from "../normalize-tag.js";

describe("[normalizeTag]", () => {
  test("passes through canonical bare subtags", () => {
    expect(normalizeTag("en")).toBe("en");
    expect(normalizeTag("es")).toBe("es");
    expect(normalizeTag("ja")).toBe("ja");
  });

  test("passes through canonical tags with region", () => {
    expect(normalizeTag("en-US")).toBe("en-US");
    expect(normalizeTag("es-AR")).toBe("es-AR");
    expect(normalizeTag("pt-BR")).toBe("pt-BR");
  });

  test("lowercases the base subtag", () => {
    expect(normalizeTag("EN")).toBe("en");
    expect(normalizeTag("Es")).toBe("es");
    expect(normalizeTag("AR")).toBe("ar");
  });

  test("uppercases the region", () => {
    expect(normalizeTag("en-us")).toBe("en-US");
    expect(normalizeTag("es-ar")).toBe("es-AR");
    expect(normalizeTag("pt-br")).toBe("pt-BR");
  });

  test("canonicalizes mixed-case tags", () => {
    expect(normalizeTag("eN-Us")).toBe("en-US");
    expect(normalizeTag("ZH-cn")).toBe("zh-CN");
  });

  test("returns undefined when the base subtag is not supported", () => {
    expect(normalizeTag("klingon")).toBeUndefined();
    expect(normalizeTag("xx")).toBeUndefined();
    expect(normalizeTag("xx-YY")).toBeUndefined();
  });

  test("returns undefined for empty or non-string input", () => {
    expect(normalizeTag("")).toBeUndefined();
    // @ts-expect-error — exercising runtime defense
    expect(normalizeTag(null)).toBeUndefined();
    // @ts-expect-error — exercising runtime defense
    expect(normalizeTag(undefined)).toBeUndefined();
    // @ts-expect-error — exercising runtime defense
    expect(normalizeTag(42)).toBeUndefined();
  });

  test("trailing dash degrades to the bare subtag", () => {
    // A trailing `-` (empty region) is treated as no region: return the base.
    expect(normalizeTag("en-")).toBe("en");
    expect(normalizeTag("es-")).toBe("es");
  });

  test("preserves arbitrary region content (script tags, multi-char regions)", () => {
    // The helper is intentionally lenient on the region: any non-empty
    // string after the dash is uppercased and kept.
    expect(normalizeTag("zh-Hans")).toBe("zh-HANS");
    expect(normalizeTag("en-419")).toBe("en-419"); // numeric UN M.49 region
  });
});
