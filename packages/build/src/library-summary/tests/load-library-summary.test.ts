import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadLibrarySummary } from "../load-library-summary.js";
import type { ComponentDefinition } from "../../typings/library-components.js";

const SAMPLE: ComponentDefinition[] = [
  {
    access: "public",
    tagName: "kst-test",
    className: "KstTest",
    description: "A test component.",
    fullClassJSDoc: "",
    srcPath: "components/kst-test.lit.ts",
    developmentStatus: "stable",
    mode: "open",
    shadow: true,
    properties: [
      {
        name: "value",
        type: "string",
        attribute: "value",
        default: "",
        description: "The value"
      }
    ]
  }
];

let projectDir: string;

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "kasstor-build-loader-"));
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe("loadLibrarySummary", () => {
  describe("JSON pointer", () => {
    it("loads an array directly when srcPath ends in .json", () => {
      const file = join(projectDir, "summary.json");
      writeFileSync(file, JSON.stringify(SAMPLE));

      const loaded = loadLibrarySummary({ srcPath: file });
      expect(loaded).not.toBeNull();
      expect(loaded?.format).toBe("json");
      expect(loaded?.source).toBe(file);
      expect(loaded?.components).toHaveLength(1);
      expect(loaded?.components[0]?.tagName).toBe("kst-test");
    });

    it("warns and returns null when JSON top-level is not an array", () => {
      const file = join(projectDir, "summary.json");
      writeFileSync(file, JSON.stringify({ wrong: "shape" }));
      const onWarning = vi.fn();

      const loaded = loadLibrarySummary({ srcPath: file, onWarning });
      expect(loaded).toBeNull();
      expect(onWarning).toHaveBeenCalledOnce();
    });

    it("calls onError with parse failures and returns null", () => {
      const file = join(projectDir, "summary.json");
      writeFileSync(file, "{ this is not JSON");
      const onError = vi.fn();

      const loaded = loadLibrarySummary({ srcPath: file, onError });
      expect(loaded).toBeNull();
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  describe("directory containing library-summary.json", () => {
    it("prefers library-summary.json when it exists alongside library-summary.ts", () => {
      const srcDir = join(projectDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "library-summary.json"), JSON.stringify(SAMPLE));
      writeFileSync(join(srcDir, "library-summary.ts"), "export const librarySummary = [] as const;");

      const loaded = loadLibrarySummary({ srcPath: srcDir });
      expect(loaded?.format).toBe("json");
      expect(loaded?.components[0]?.tagName).toBe("kst-test");
    });
  });

  describe("directory containing library-summary.ts (legacy)", () => {
    it("parses the TS literal when no JSON sibling exists", () => {
      const srcDir = join(projectDir, "src");
      mkdirSync(srcDir, { recursive: true });
      const literal = `export const librarySummary = ${JSON.stringify(SAMPLE, undefined, 2)} as const satisfies LibraryComponents;`;
      writeFileSync(join(srcDir, "library-summary.ts"), literal);

      const loaded = loadLibrarySummary({ srcPath: srcDir });
      expect(loaded?.format).toBe("ts");
      expect(loaded?.components).toHaveLength(1);
      expect(loaded?.components[0]?.tagName).toBe("kst-test");
    });

    it("warns and returns null when the export is not an array literal", () => {
      const srcDir = join(projectDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "library-summary.ts"), "export const librarySummary = { foo: 1 };");
      const onWarning = vi.fn();

      const loaded = loadLibrarySummary({ srcPath: srcDir, onWarning });
      expect(loaded).toBeNull();
      expect(onWarning).toHaveBeenCalledOnce();
    });

    it("preserves nested object literals (members + properties round-trip)", () => {
      const srcDir = join(projectDir, "src");
      mkdirSync(srcDir, { recursive: true });
      const literal = `export const librarySummary = ${JSON.stringify(SAMPLE, undefined, 2)} as const;`;
      writeFileSync(join(srcDir, "library-summary.ts"), literal);

      const loaded = loadLibrarySummary({ srcPath: srcDir });
      expect(loaded?.components[0]?.properties).toEqual(SAMPLE[0]!.properties);
    });
  });

  describe("absent inputs", () => {
    it("returns null when srcPath does not exist", () => {
      const loaded = loadLibrarySummary({ srcPath: join(projectDir, "missing") });
      expect(loaded).toBeNull();
    });

    it("returns null when directory has no recognized artifact", () => {
      const srcDir = join(projectDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "unrelated.txt"), "x");

      const loaded = loadLibrarySummary({ srcPath: srcDir });
      expect(loaded).toBeNull();
    });
  });
});
