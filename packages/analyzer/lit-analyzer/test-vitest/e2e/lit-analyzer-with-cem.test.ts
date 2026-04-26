import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import * as ts from "typescript";
import { DefaultLitAnalyzerContext } from "../../src/lib/analyze/default-lit-analyzer-context.js";
import { makeConfig } from "../../src/lib/analyze/lit-analyzer-config.js";

const FIXTURES = resolve(__dirname, "../component-sources/fixtures");
const FAKE_PKG = join(FIXTURES, "pkg-with-manifest");
const KASSTOR_FIXTURE = join(FIXTURES, "kasstor-summary-fixture");

/**
 * End-to-end integration: build a temp project that exercises ALL three
 * non-WCA component-source paths simultaneously and verify that the resulting
 * `htmlStore` is the union of:
 *   - CEM ingested from `node_modules/fake-pkg-with-manifest/` (provides `<fake-button>`),
 *   - the Kasstor library summary at `<root>/src/library-summary.ts` (provides `<kst-card>`),
 *   - WCA falling back for any user file not covered by a manifest.
 */
describe("LitAnalyzerContext + CEM + Kasstor library-summary", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), "kasstor-e2e-"));
    writeFileSync(
      join(projectRoot, "package.json"),
      JSON.stringify({
        name: "e2e-test-project",
        version: "0.0.0",
        dependencies: { "fake-pkg-with-manifest": "1.0.0" }
      })
    );

    // CEM-shipping dependency
    mkdirSync(join(projectRoot, "node_modules"), { recursive: true });
    cpSync(FAKE_PKG, join(projectRoot, "node_modules", "fake-pkg-with-manifest"), {
      recursive: true
    });

    // Kasstor library-summary at <root>/src/library-summary.ts
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    cpSync(
      join(KASSTOR_FIXTURE, "src", "library-summary.ts"),
      join(projectRoot, "src", "library-summary.ts")
    );
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  function buildContext() {
    const program = ts.createProgram({
      rootNames: [],
      options: { noEmit: true }
    });

    const context = new DefaultLitAnalyzerContext({
      ts,
      getProgram: () => program
    });

    context.updateConfig(
      makeConfig({
        cwd: projectRoot,
        useWebComponentAnalyzer: "never" // isolate the manifest path
      })
    );

    return context;
  }

  it("loads CEM-described tags from node_modules into htmlStore", () => {
    const context = buildContext();
    // Externals load lazily on first findInvalidatedComponents; force it.
    // Triggering update with an empty file list still runs the lazy load.
    context.updateComponents({ fileName: join(projectRoot, "src", "app.ts") } as ts.SourceFile);

    expect(context.htmlStore.getHtmlTag("fake-button")).toBeDefined();
    expect(context.htmlStore.getHtmlTag("fake-button")?.attributes.map(a => a.name)).toContain(
      "label"
    );
  });

  it("loads Kasstor library-summary tags into htmlStore", () => {
    const context = buildContext();
    context.updateComponents({ fileName: join(projectRoot, "src", "app.ts") } as ts.SourceFile);

    const card = context.htmlStore.getHtmlTag("kst-card");
    expect(card).toBeDefined();
    expect(card?.attributes.map(a => a.name)).toContain("header");
  });

  it("reflects both sources in a single htmlStore", () => {
    const context = buildContext();
    context.updateComponents({ fileName: join(projectRoot, "src", "app.ts") } as ts.SourceFile);

    expect(context.htmlStore.getHtmlTag("fake-button")).toBeDefined();
    expect(context.htmlStore.getHtmlTag("kst-card")).toBeDefined();
    expect(context.htmlStore.getHtmlTag("definitely-not-a-tag")).toBeUndefined();
  });

  it("respects kasstorSummary: false (only CEM + WCA)", () => {
    const program = ts.createProgram({ rootNames: [], options: { noEmit: true } });
    const context = new DefaultLitAnalyzerContext({ ts, getProgram: () => program });

    context.updateConfig(
      makeConfig({
        cwd: projectRoot,
        useWebComponentAnalyzer: "never",
        kasstorSummary: false
      })
    );

    context.updateComponents({ fileName: join(projectRoot, "src", "app.ts") } as ts.SourceFile);

    expect(context.htmlStore.getHtmlTag("fake-button")).toBeDefined();
    expect(context.htmlStore.getHtmlTag("kst-card")).toBeUndefined();
  });

  it("respects externalManifests.scanNodeModules: false (only kasstor + WCA)", () => {
    const program = ts.createProgram({ rootNames: [], options: { noEmit: true } });
    const context = new DefaultLitAnalyzerContext({ ts, getProgram: () => program });

    context.updateConfig(
      makeConfig({
        cwd: projectRoot,
        useWebComponentAnalyzer: "never",
        externalManifests: { scanNodeModules: false }
      })
    );

    context.updateComponents({ fileName: join(projectRoot, "src", "app.ts") } as ts.SourceFile);

    expect(context.htmlStore.getHtmlTag("fake-button")).toBeUndefined();
    expect(context.htmlStore.getHtmlTag("kst-card")).toBeDefined();
  });
});
