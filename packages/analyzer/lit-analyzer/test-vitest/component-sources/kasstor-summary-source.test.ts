import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import * as ts from "typescript";
import { KasstorSummarySource } from "../../src/lib/analyze/component-sources/kasstor-summary-source.js";
import type { ExternalManifestSourceContext } from "../../src/lib/analyze/component-sources/external-manifest-source.js";
import { isCustomElementDeclaration } from "../../src/lib/analyze/component-sources/cem-types.js";

const FIXTURE = resolve(__dirname, "fixtures/kasstor-summary-fixture");

function fakeCtx(programRoot: string): ExternalManifestSourceContext {
  return {
    programRoot,
    ts,
    program: ts.createProgram({ rootNames: [], options: {} }),
    logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
  };
}

describe("KasstorSummarySource", () => {
  it("parses the fixture library-summary.ts via TS AST and emits one module", async () => {
    const src = new KasstorSummarySource("auto");
    const manifests = await src.load(fakeCtx(FIXTURE));
    expect(manifests).toHaveLength(1);
    const decl = manifests[0]!.manifest.modules[0]!.declarations![0]!;
    expect(isCustomElementDeclaration(decl)).toBe(true);
    if (!isCustomElementDeclaration(decl)) return;
    expect(decl.tagName).toBe("kst-card");
  });

  it("returns [] when programRoot has no library-summary anywhere", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kasstor-empty-"));
    const src = new KasstorSummarySource("auto");
    const manifests = await src.load(fakeCtx(dir));
    expect(manifests).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("respects an explicit srcPath pointing to a directory containing library-summary.ts", async () => {
    const src = new KasstorSummarySource({ srcPath: "src" });
    const manifests = await src.load(fakeCtx(FIXTURE));
    expect(manifests).toHaveLength(1);
  });

  it("falls back to library-summary.json when present (preferred future format)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kasstor-json-"));
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(
      join(dir, "src/library-summary.json"),
      JSON.stringify([
        {
          access: "public",
          tagName: "kst-from-json",
          className: "KstFromJson",
          description: "",
          fullClassJSDoc: "",
          srcPath: "from-json.ts",
          developmentStatus: "stable",
          mode: "open",
          shadow: true
        }
      ])
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));

    const src = new KasstorSummarySource("auto");
    const manifests = await src.load(fakeCtx(dir));
    expect(manifests).toHaveLength(1);
    const decl = manifests[0]!.manifest.modules[0]!.declarations![0]!;
    if (isCustomElementDeclaration(decl)) {
      expect(decl.tagName).toBe("kst-from-json");
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns and returns [] on a malformed library-summary.ts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kasstor-bad-"));
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(
      join(dir, "src/library-summary.ts"),
      "export const notAnArray = { foo: 1 } as const;"
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));

    const ctx = fakeCtx(dir);
    const src = new KasstorSummarySource("auto");
    const manifests = await src.load(ctx);
    expect(manifests).toEqual([]);
    expect(ctx.logger.warn).toHaveBeenCalled();
    rmSync(dir, { recursive: true, force: true });
  });

  it("coversSourceFile returns the package marker for files inside the project root", async () => {
    const src = new KasstorSummarySource("auto");
    await src.load(fakeCtx(FIXTURE));
    const fakeFile = { fileName: join(FIXTURE, "src/components/something.ts") } as ts.SourceFile;
    expect(src.coversSourceFile(fakeFile)).toBe("<kasstor-summary>");
  });

  it("walks down a monorepo-style root and discovers nested library-summary files", async () => {
    // Layout the test creates:
    //
    //   <tmp>/repo/
    //     packages/
    //       a/src/library-summary.json
    //       b/src/library-summary.json
    //       c/src/                     <-- no summary, must be ignored
    //     node_modules/<must-not-recurse>/src/library-summary.json  (skip dir)
    //
    // The user's actual symptom — opening Cursor at the monorepo root and
    // not getting any kasstor completions — was caused by the loader only
    // looking at `<programRoot>/src` and `<programRoot>`. This test pins
    // the new walk-down behaviour.
    const repo = mkdtempSync(join(tmpdir(), "kasstor-mono-"));
    const make = (relPath: string, tagName: string) => {
      const dir = join(repo, relPath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "library-summary.json"),
        JSON.stringify([
          {
            access: "public",
            tagName,
            className: tagName.replace(/-./g, m => m[1]!.toUpperCase()).replace(/^./, m => m.toUpperCase()),
            description: "",
            srcPath: "./x.ts",
            developmentStatus: "stable",
            mode: "open",
            shadow: true
          }
        ])
      );
    };
    make("packages/a/src", "kst-a");
    make("packages/b/src", "kst-b");
    mkdirSync(join(repo, "packages/c/src"), { recursive: true });
    // Decoy summary deep inside node_modules — must be skipped because
    // descending into `node_modules` is one of the cold-start traps.
    make("node_modules/decoy/src", "kst-decoy");

    const ctx = fakeCtx(repo);
    const src = new KasstorSummarySource("auto");
    const manifests = await src.load(ctx);

    const tagNames = manifests
      .flatMap(m => m.manifest.modules)
      .flatMap(mod => mod.declarations ?? [])
      .filter(isCustomElementDeclaration)
      .map(d => d.tagName)
      .sort();
    expect(tagNames).toEqual(["kst-a", "kst-b"]);
    expect(tagNames).not.toContain("kst-decoy");

    rmSync(repo, { recursive: true, force: true });
  });
});
