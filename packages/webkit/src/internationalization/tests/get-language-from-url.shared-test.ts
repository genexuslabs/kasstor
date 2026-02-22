import { describe, expect, test } from "vitest";
import { getLanguageFromUrl } from "../index.js";
import { SUPPORTED_SUBTAGS } from "./i18n-shared-constants.js";

describe("[getLanguageFromUrl]", () => {
  const extractsSubtag: { pathname: string; expected: string }[] = [
    { pathname: "/en", expected: "en" },
    { pathname: "/en/home", expected: "en" },
    { pathname: "/es/home", expected: "es" },
    { pathname: "/fr/foo/bar", expected: "fr" },
    { pathname: "/ja", expected: "ja" },
    { pathname: "/es/", expected: "es" },
    { pathname: "/zh/dashboard", expected: "zh" }
  ];

  test.each(extractsSubtag)(
    "extracts $expected from pathname $pathname",
    ({ pathname, expected }) => {
      expect(getLanguageFromUrl(pathname)).toBe(expected);
    }
  );

  test("extracts each supported subtag when used as first segment", () => {
    SUPPORTED_SUBTAGS.forEach(subtag => {
      expect(getLanguageFromUrl(`/${subtag}`)).toBe(subtag);
      expect(getLanguageFromUrl(`/${subtag}/any/path`)).toBe(subtag);
    });
  });

  test("extracts only the first segment when path has multiple segments", () => {
    expect(getLanguageFromUrl("/ab/cd/ef")).toBe("ab");
  });

  const returnsNull: { pathname: string; description: string }[] = [
    { pathname: "/", description: "root path" },
    { pathname: "", description: "empty pathname" },
    { pathname: "/home", description: "path without language segment" },
    { pathname: "/123/ab", description: "numeric first segment" },
    { pathname: "/en-US", description: "region-specific code" },
    { pathname: "/e", description: "single letter" },
    { pathname: "/eng", description: "three letters" },
    { pathname: "/EN", description: "uppercase two letters" }
  ];

  test.each(returnsNull)(
    "returns null for $description ($pathname)",
    ({ pathname }) => {
      expect(getLanguageFromUrl(pathname)).toBeNull();
    }
  );

  test("returns null when first segment is not exactly two lowercase letters", () => {
    expect(getLanguageFromUrl("/En")).toBeNull();
    expect(getLanguageFromUrl("/eN")).toBeNull();
    expect(getLanguageFromUrl("/1s")).toBeNull();
  });
});
