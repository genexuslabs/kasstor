import { bench, describe } from "vitest";
import * as ts from "typescript";
import { DefaultLitAnalyzerContext } from "../../src/lib/analyze/default-lit-analyzer-context.js";
import { LitAnalyzer } from "../../src/lib/analyze/lit-analyzer.js";
import { makeConfig } from "../../src/lib/analyze/lit-analyzer-config.js";
import { analyzeSourceFile } from "../../src/lib/kasstor-analyzer/index.js";

/**
 * Benchmarks the hot paths the IDE plugin and the CLI exercise on every
 * analysis pass. The fixtures are intentionally compact (so individual
 * iterations stay below ~10 ms and we get statistically meaningful
 * iteration counts), but each one represents a category of real work:
 *
 *   - "single component"  — the typical save-on-edit case in an IDE.
 *   - "many components"   — what `kasstor-lit-analyzer src/` runs in CLI.
 *   - "htmlStore lookups" — what the rule engine does once per binding.
 *   - "generics refine"   — the per-file pass added for `runem#149`.
 *
 * The numbers are gathered with Vitest's tinybench integration; report
 * them via `bun analyzer:test:bench`.
 */

// -----------------------------------------------------------------------------
// Fixture builders
// -----------------------------------------------------------------------------

const TS_OPTS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  experimentalDecorators: true,
  lib: ["lib.dom.d.ts", "lib.es2022.d.ts"],
  noEmit: true,
  skipLibCheck: true
};

const SINGLE_LIT_COMPONENT = `
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * @slot - default slot
 * @slot icon - icon slot
 * @csspart base - root part
 * @cssprop --bg color background
 */
@customElement("kst-bench-button")
export class KstBenchButton extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number }) tabIndex = 0;
  @state() private _hovered = false;

  render() {
    return html\`<button ?disabled=\${this.disabled}>\${this.label}<slot></slot></button>\`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kst-bench-button": KstBenchButton;
  }
}
`;

function makeProgram(files: { name: string; text: string }[]): ts.Program {
  const sources = new Map(
    files.map(f => [f.name, ts.createSourceFile(f.name, f.text, ts.ScriptTarget.ES2022, true)])
  );
  const host = ts.createCompilerHost(TS_OPTS, true);
  const originalGetSource = host.getSourceFile;
  host.getSourceFile = (name, lang, onError, shouldCreate) =>
    sources.get(name) ?? originalGetSource.call(host, name, lang, onError, shouldCreate);
  host.fileExists = n => sources.has(n) || ts.sys.fileExists(n);
  host.readFile = n => sources.get(n)?.text ?? ts.sys.readFile(n);
  return ts.createProgram(
    files.map(f => f.name),
    TS_OPTS,
    host
  );
}

function repeatComponents(n: number): { name: string; text: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `/virtual/comp-${i}.ts`,
    text: SINGLE_LIT_COMPONENT.replace(/kst-bench-button/g, `kst-bench-button-${i}`).replace(
      /KstBenchButton/g,
      `KstBenchButton${i}`
    )
  }));
}

// -----------------------------------------------------------------------------
// Benchmarks
// -----------------------------------------------------------------------------

describe("analyzer hot paths", () => {
  // Pre-build programs once — the cost we want to measure is the analyzer's
  // walk, not `ts.createProgram` (which dominates on cold start).
  const programSingle = makeProgram([{ name: "/virtual/single.ts", text: SINGLE_LIT_COMPONENT }]);
  const programMany = makeProgram(repeatComponents(50));

  bench("analyzeSourceFile (single Lit component, cached run)", () => {
    const sf = programSingle.getSourceFile("/virtual/single.ts");
    if (!sf) return;
    analyzeSourceFile(sf, { program: programSingle, ts });
  });

  bench("analyzeSourceFile (50 Lit components, cold cache)", () => {
    for (const sf of programMany.getSourceFiles()) {
      if (sf.fileName.startsWith("/virtual/comp-")) {
        analyzeSourceFile(sf, { program: programMany, ts });
      }
    }
  });

  bench("LitAnalyzer.updateComponents — single file", () => {
    const ctx = new DefaultLitAnalyzerContext({ ts, getProgram: () => programSingle });
    ctx.updateConfig(makeConfig({}));
    const sf = programSingle.getSourceFile("/virtual/single.ts")!;
    new LitAnalyzer(ctx);
    ctx.updateComponents(sf);
  });

  bench("htmlStore.getHtmlTag — registered tag", () => {
    const ctx = new DefaultLitAnalyzerContext({ ts, getProgram: () => programSingle });
    ctx.updateConfig(makeConfig({}));
    new LitAnalyzer(ctx);
    ctx.updateComponents(programSingle.getSourceFile("/virtual/single.ts")!);
    for (let i = 0; i < 1000; i++) {
      ctx.htmlStore.getHtmlTag("kst-bench-button");
    }
  });
});
