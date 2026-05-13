/**
 * Tests for `getBaseSubtag`. Pure helper: no globals, no window — runs in both
 * Node and Browser projects.
 */

import { describe, expect, test } from "vitest";
import { getBaseSubtag } from "../get-base-subtag.js";
import type { KasstorLanguageTag } from "../types";

describe("[getBaseSubtag]", () => {
  test("returns the tag unchanged when there is no region", () => {
    expect(getBaseSubtag("en")).toBe("en");
    expect(getBaseSubtag("es")).toBe("es");
    expect(getBaseSubtag("ar")).toBe("ar");
  });

  test("strips the region when present", () => {
    expect(getBaseSubtag("en-US")).toBe("en");
    expect(getBaseSubtag("es-AR")).toBe("es");
    expect(getBaseSubtag("pt-BR")).toBe("pt");
    expect(getBaseSubtag("zh-CN")).toBe("zh");
  });

  test("works for every supported subtag with region", () => {
    const cases: { tag: KasstorLanguageTag; base: string }[] = [
      { tag: "en-US", base: "en" },
      { tag: "es-ES", base: "es" },
      { tag: "fr-FR", base: "fr" },
      { tag: "de-DE", base: "de" },
      { tag: "pt-BR", base: "pt" },
      { tag: "it-IT", base: "it" },
      { tag: "zh-CN", base: "zh" },
      { tag: "ar-SA", base: "ar" },
      { tag: "ja-JP", base: "ja" }
    ];
    for (const { tag, base } of cases) {
      expect(getBaseSubtag(tag)).toBe(base);
    }
  });

  test("handles arbitrary multi-character region content", () => {
    // The helper splits on the first `-`; whatever follows is opaque.
    expect(getBaseSubtag("en-GB" as KasstorLanguageTag)).toBe("en");
    expect(getBaseSubtag("zh-Hans" as KasstorLanguageTag)).toBe("zh");
  });
});
