import { describe, expect, it, vi } from "vitest";
import { join, resolve } from "path";
import * as ts from "typescript";
import { CemExplicitSource } from "../../src/lib/analyze/component-sources/cem-explicit-source.js";
import type { ExternalManifestSourceContext } from "../../src/lib/analyze/component-sources/external-manifest-source.js";

const FIXTURES = resolve(__dirname, "fixtures/pkg-with-manifest");
const PROGRAM_ROOT = FIXTURES; // for explicit source, programRoot is just the relative anchor

function fakeCtx(extras?: Partial<ExternalManifestSourceContext>): ExternalManifestSourceContext {
  const program = ts.createProgram({ rootNames: [], options: {} });
  return {
    programRoot: PROGRAM_ROOT,
    ts,
    program,
    logger: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    ...extras
  };
}

describe("CemExplicitSource", () => {
  it("loads a manifest by absolute path", async () => {
    const src = new CemExplicitSource([join(FIXTURES, "manifest.json")]);
    const ctx = fakeCtx();
    const manifests = await src.load(ctx);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]!.manifest.modules[0]!.declarations![0]!.name).toBe("FakeButton");
  });

  it("loads a manifest by relative path resolved from programRoot", async () => {
    const src = new CemExplicitSource(["manifest.json"]);
    const ctx = fakeCtx({ programRoot: FIXTURES });
    const manifests = await src.load(ctx);
    expect(manifests).toHaveLength(1);
  });

  it("warns and skips when manifest file does not exist", async () => {
    const src = new CemExplicitSource([join(FIXTURES, "missing.json")]);
    const ctx = fakeCtx();
    const manifests = await src.load(ctx);
    expect(manifests).toEqual([]);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });

  it("coversSourceFile returns sourceName for files inside the manifest's directory", async () => {
    const src = new CemExplicitSource([join(FIXTURES, "manifest.json")]);
    await src.load(fakeCtx());
    const fakeFile = { fileName: join(FIXTURES, "src/foo.ts") } as ts.SourceFile;
    expect(src.coversSourceFile(fakeFile)).toBeDefined();
  });

  it("coversSourceFile returns undefined for unrelated files", async () => {
    const src = new CemExplicitSource([join(FIXTURES, "manifest.json")]);
    await src.load(fakeCtx());
    const fakeFile = { fileName: "/totally/unrelated/path/foo.ts" } as ts.SourceFile;
    expect(src.coversSourceFile(fakeFile)).toBeUndefined();
  });
});
