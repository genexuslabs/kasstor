import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, cpSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import * as ts from "typescript";
import { CemNodeModulesSource } from "../../src/lib/analyze/component-sources/cem-node-modules-source.js";
import type { ExternalManifestSourceContext } from "../../src/lib/analyze/component-sources/external-manifest-source.js";

const FIXTURES = resolve(__dirname, "fixtures/pkg-with-manifest");

function makeProject(deps: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "kasstor-cem-test-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "test-project", version: "0.0.0", dependencies: deps })
  );
  mkdirSync(join(dir, "node_modules"), { recursive: true });
  return dir;
}

function fakeCtx(programRoot: string): ExternalManifestSourceContext {
  return {
    programRoot,
    ts,
    program: ts.createProgram({ rootNames: [], options: {} }),
    logger: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };
}

describe("CemNodeModulesSource", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeProject({ "fake-pkg-with-manifest": "1.0.0" });
    cpSync(FIXTURES, join(projectRoot, "node_modules", "fake-pkg-with-manifest"), { recursive: true });
  });

  it("loads CEM from a direct dep with package.json#customElements", async () => {
    const src = new CemNodeModulesSource();
    const manifests = await src.load(fakeCtx(projectRoot));
    expect(manifests).toHaveLength(1);
    expect(manifests[0]!.sourceName).toBe("fake-pkg-with-manifest");
    expect(manifests[0]!.manifest.modules[0]!.declarations![0]!.name).toBe("FakeButton");
  });

  it("ignores deps without customElements field", async () => {
    const dir = makeProject({ "no-cem-pkg": "1.0.0" });
    mkdirSync(join(dir, "node_modules", "no-cem-pkg"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules", "no-cem-pkg", "package.json"),
      JSON.stringify({ name: "no-cem-pkg", version: "1.0.0" })
    );

    const src = new CemNodeModulesSource();
    const manifests = await src.load(fakeCtx(dir));
    expect(manifests).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns and skips when customElements points at a missing file", async () => {
    const dir = makeProject({ "broken-cem-pkg": "1.0.0" });
    mkdirSync(join(dir, "node_modules", "broken-cem-pkg"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules", "broken-cem-pkg", "package.json"),
      JSON.stringify({ name: "broken-cem-pkg", version: "1.0.0", customElements: "missing.json" })
    );

    const ctx = fakeCtx(dir);
    const src = new CemNodeModulesSource();
    const manifests = await src.load(ctx);
    expect(manifests).toEqual([]);
    expect(ctx.logger.warn).toHaveBeenCalled();
    rmSync(dir, { recursive: true, force: true });
  });

  it("coversSourceFile returns the package name for files inside the package", async () => {
    const src = new CemNodeModulesSource();
    await src.load(fakeCtx(projectRoot));
    const fakeFile = {
      fileName: join(projectRoot, "node_modules", "fake-pkg-with-manifest", "src", "fake-button.ts")
    } as ts.SourceFile;
    expect(src.coversSourceFile(fakeFile)).toBe("fake-pkg-with-manifest");
  });

  it("coversSourceFile returns undefined for unrelated files", async () => {
    const src = new CemNodeModulesSource();
    await src.load(fakeCtx(projectRoot));
    const fakeFile = { fileName: join(projectRoot, "src/app.ts") } as ts.SourceFile;
    expect(src.coversSourceFile(fakeFile)).toBeUndefined();
  });
});
