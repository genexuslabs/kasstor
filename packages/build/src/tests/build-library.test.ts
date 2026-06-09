import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub readme generation so we can count how often it runs (it's the expensive
// step — prettier + micromark — the readme-skip filter is meant to avoid).
vi.mock("../readme/get-component-readme.js", () => ({
  getComponentReadme: vi.fn(async (component: { tagName: string }) => `# ${component.tagName}\n`)
}));

import { buildLibrary, resetBuildCache } from "../build-library.js";
import { AUTO_GENERATED_MARKER } from "../global-type-declarations/constants.js";
import { getComponentReadme } from "../readme/get-component-readme.js";
import type { KasstorBuildOptions } from "../typings/build-options.js";

const getComponentReadmeMock = vi.mocked(getComponentReadme);

/**
 * Generated-file regeneration is driven from `process.cwd()`, so each test runs
 * inside its own temp project dir. The build only generates the library summary
 * and the core component declaration file (`components.ts`) — readmes, the
 * per-type folder and the framework JSX files are turned off to keep the
 * fixtures minimal.
 */
const SRC = "src/";

const BUILD_OPTIONS: KasstorBuildOptions = {
  relativeComponentsSrcPath: SRC,
  fileGeneration: {
    exportTypesForReact: false,
    readmesForComponents: false,
    typeDeclarationsFolder: false,
    cleanupLegacyComponentTypes: false
  }
};

const README_OPTIONS: KasstorBuildOptions = {
  ...BUILD_OPTIONS,
  fileGeneration: { ...BUILD_OPTIONS.fileGeneration, readmesForComponents: true }
};

// Same as BUILD_OPTIONS but with the legacy-type cleanup enabled (it is on by
// default; BUILD_OPTIONS turns it off). This is the ONLY part of the build that
// can write back into a component's own `.lit.ts` file.
const CLEANUP_OPTIONS: KasstorBuildOptions = {
  relativeComponentsSrcPath: SRC,
  fileGeneration: {
    exportTypesForReact: false,
    readmesForComponents: false,
    typeDeclarationsFolder: false
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const componentSource = (tagName: string, className: string): string =>
  `import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "${tagName}" })
export class ${className} extends KasstorElement {
  override render() {
    return html\`<div></div>\`;
  }
}
`;

describe("buildLibrary — incremental cache reconciliation", () => {
  let projectDir: string;
  let originalCwd: string;

  const writeComponent = async (
    relativeFile: string,
    tagName: string,
    className: string
  ): Promise<string> => {
    const absolutePath = join(projectDir, SRC, relativeFile);
    await mkdir(join(absolutePath, ".."), { recursive: true });
    await writeFile(absolutePath, componentSource(tagName, className), "utf-8");
    return absolutePath;
  };

  const readGenerated = async (): Promise<{ summary: string; declaration: string }> => ({
    summary: await readFile(join(projectDir, SRC, "library-summary.ts"), "utf-8"),
    declaration: await readFile(join(projectDir, SRC, "components.ts"), "utf-8")
  });

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await mkdtemp(join(tmpdir(), "kasstor-build-library-"));
    process.chdir(projectDir);
    // The module-level incremental cache persists across calls within a
    // process; reset it so each test starts from a clean slate.
    resetBuildCache();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
    resetBuildCache();
  });

  it("prunes a deleted component from the generated files on a complete scan", async () => {
    await writeComponent("alpha/alpha.lit.ts", "x-alpha", "XAlpha");
    const betaPath = await writeComponent("beta/beta.lit.ts", "x-beta", "XBeta");

    // First complete scan: both components are present.
    await buildLibrary(BUILD_OPTIONS, { scanIsComplete: true });

    let generated = await readGenerated();
    expect(generated.summary).toContain("x-alpha");
    expect(generated.summary).toContain("x-beta");
    expect(generated.declaration).toContain("x-alpha");
    expect(generated.declaration).toContain("x-beta");

    // Delete one component and run another COMPLETE scan (this mirrors
    // `vite build --watch`, whose `buildStart` re-scans every file on each
    // rebuild). The deleted component must disappear from both generated files.
    await rm(betaPath);
    await buildLibrary(BUILD_OPTIONS, { scanIsComplete: true });

    generated = await readGenerated();
    expect(generated.summary).toContain("x-alpha");
    expect(generated.summary).not.toContain("x-beta");
    expect(generated.declaration).toContain("x-alpha");
    expect(generated.declaration).not.toContain("x-beta");
  });

  it("keeps cached components on a single-file incremental scan (no false pruning)", async () => {
    await writeComponent("alpha/alpha.lit.ts", "x-alpha", "XAlpha");
    await writeComponent("beta/beta.lit.ts", "x-beta", "XBeta");

    // Seed the cache with a complete scan.
    await buildLibrary(BUILD_OPTIONS, { scanIsComplete: true });

    // A single-file incremental pass only re-scans alpha. Beta is absent from
    // THIS scan but was not deleted — it must be preserved (the cache is
    // authoritative for files not in the partial scan).
    await buildLibrary(
      { ...BUILD_OPTIONS, includedPaths: /alpha\.lit\.ts$/ },
      true
    );

    const generated = await readGenerated();
    expect(generated.summary).toContain("x-alpha");
    expect(generated.summary).toContain("x-beta");
    expect(generated.declaration).toContain("x-alpha");
    expect(generated.declaration).toContain("x-beta");
  });

  it("does not rewrite the generated files when nothing changed", async () => {
    await writeComponent("alpha/alpha.lit.ts", "x-alpha", "XAlpha");
    await buildLibrary(BUILD_OPTIONS, { scanIsComplete: true });

    const summaryPath = join(projectDir, SRC, "library-summary.ts");
    const declarationPath = join(projectDir, SRC, "components.ts");
    const summaryMtime = (await stat(summaryPath)).mtimeMs;
    const declarationMtime = (await stat(declarationPath)).mtimeMs;

    // A second identical complete scan must not touch the files (so it does not
    // re-trigger external watchers such as tsgo --watch).
    await buildLibrary(BUILD_OPTIONS, { scanIsComplete: true });

    expect((await stat(summaryPath)).mtimeMs).toBe(summaryMtime);
    expect((await stat(declarationPath)).mtimeMs).toBe(declarationMtime);
  });

  it("only regenerates the readme of a component whose source file changed", async () => {
    await writeComponent("alpha/alpha.lit.ts", "x-alpha", "XAlpha");
    const betaPath = await writeComponent("beta/beta.lit.ts", "x-beta", "XBeta");

    // First build regenerates every readme (nothing is cached yet).
    getComponentReadmeMock.mockClear();
    await buildLibrary(README_OPTIONS, { scanIsComplete: true });
    expect(getComponentReadmeMock).toHaveBeenCalledTimes(2);

    // An identical rebuild regenerates nothing — the filter compares file
    // content and skips the expensive readme generation for unchanged files.
    getComponentReadmeMock.mockClear();
    await buildLibrary(README_OPTIONS, { scanIsComplete: true });
    expect(getComponentReadmeMock).not.toHaveBeenCalled();

    // Touching only beta's source regenerates only beta's readme.
    getComponentReadmeMock.mockClear();
    await writeFile(betaPath, `${componentSource("x-beta", "XBeta")}\n// touched\n`, "utf-8");
    await buildLibrary(README_OPTIONS, { scanIsComplete: true });
    expect(getComponentReadmeMock).toHaveBeenCalledTimes(1);
    expect(getComponentReadmeMock.mock.calls[0]?.[0]?.tagName).toBe("x-beta");
  });

  it("never rewrites a clean .lit.ts, and strips a legacy auto-generated block exactly once", async () => {
    // A clean component with NO auto-generated block.
    const cleanPath = await writeComponent("alpha/alpha.lit.ts", "x-alpha", "XAlpha");

    // A component that still carries the legacy marker + `declare global` block.
    const legacyPath = join(projectDir, SRC, "beta/beta.lit.ts");
    await mkdir(join(legacyPath, ".."), { recursive: true });
    const legacyBlock =
      `\n${AUTO_GENERATED_MARKER}\n\n` +
      `declare global {\n  interface HTMLElementTagNameMap {\n    "x-beta": XBeta;\n  }\n}\n`;
    await writeFile(legacyPath, componentSource("x-beta", "XBeta") + legacyBlock, "utf-8");

    const cleanContent = await readFile(cleanPath, "utf-8");
    const cleanMtime = (await stat(cleanPath)).mtimeMs;

    // Delay so that *any* rewrite by the build would produce a later mtime
    // (mtime is the only signal that catches a no-op rewrite — a rewrite with
    // identical content, which is exactly the watcher-thrash we must avoid).
    await sleep(20);
    await buildLibrary(CLEANUP_OPTIONS, { scanIsComplete: true });

    // The clean file is NEVER touched by the build.
    expect((await stat(cleanPath)).mtimeMs).toBe(cleanMtime);
    expect(await readFile(cleanPath, "utf-8")).toBe(cleanContent);

    // The legacy file is stripped (rewritten) exactly this once.
    const strippedLegacy = await readFile(legacyPath, "utf-8");
    expect(strippedLegacy).not.toContain(AUTO_GENERATED_MARKER);
    expect(strippedLegacy).not.toContain("declare global");
    const legacyMtime = (await stat(legacyPath)).mtimeMs;

    // A second build must not rewrite either file: the clean one never had a
    // block, and the legacy one no longer does (idempotent — the only condition
    // under which a `.lit.ts` is written is the presence of the block).
    await sleep(20);
    await buildLibrary(CLEANUP_OPTIONS, { scanIsComplete: true });

    expect((await stat(cleanPath)).mtimeMs).toBe(cleanMtime);
    expect((await stat(legacyPath)).mtimeMs).toBe(legacyMtime);
  });
});
