import { describe, expect, test } from "vitest";
import { getLanguageFromUrl } from "../index.js";

describe("[getLanguageFromUrl]", () => {
  test("extracts es from /es/home", () => {
    expect(getLanguageFromUrl("/es/home")).toBe("es");
  });

  test("extracts en from /en", () => {
    expect(getLanguageFromUrl("/en")).toBe("en");
  });

  test("extracts fr from /fr/foo/bar", () => {
    expect(getLanguageFromUrl("/fr/foo/bar")).toBe("fr");
  });

  test("returns null for path without language segment /home", () => {
    expect(getLanguageFromUrl("/home")).toBeNull();
  });

  test("returns null for /123/ab", () => {
    expect(getLanguageFromUrl("/123/ab")).toBeNull();
  });

  test("returns null for root path /", () => {
    expect(getLanguageFromUrl("/")).toBeNull();
  });

  test("returns null for empty pathname", () => {
    expect(getLanguageFromUrl("")).toBeNull();
  });

  test("extracts two-letter segment when path has single segment", () => {
    expect(getLanguageFromUrl("/ja")).toBe("ja");
  });

  test("returns null when first segment is not exactly two letters (e.g. /en-US)", () => {
    expect(getLanguageFromUrl("/en-US")).toBeNull();
  });
});
