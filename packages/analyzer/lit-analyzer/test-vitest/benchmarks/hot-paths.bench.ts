import { bench, describe } from "vitest";
import * as ts from "typescript";
import { PackageRootIndex } from "../../src/lib/analyze/component-sources/package-root-index.js";
import { convertCemPackageToHtmlCollection } from "../../src/lib/analyze/parse/parse-cem-collection.js";
import { convertKasstorSummaryToCem } from "../../src/lib/analyze/parse/parse-kasstor-summary.js";
import { refineGenericTagTypesInScope } from "../../src/lib/analyze/parse/refine-generics.js";
import type { CemPackage } from "../../src/lib/analyze/component-sources/cem-types.js";
import type { ComponentDefinition } from "@genexus/kasstor-build";
import type { HtmlTag } from "../../src/lib/analyze/parse/parse-html-data/html-tag.js";

/**
 * Hot-path microbenchmarks. Each function here is invoked many times during
 * a single analyzer pass, so the absolute numbers translate directly into
 * cumulative analyzer latency.
 */

// -----------------------------------------------------------------------------
// PackageRootIndex.cover — called once per analyzed source file
// -----------------------------------------------------------------------------

const FAKE_ROOTS: Array<[string, string]> = [
  ["/repo/node_modules/@shoelace-style/shoelace", "@shoelace-style/shoelace"],
  ["/repo/node_modules/@material/web", "@material/web"],
  ["/repo/node_modules/lit", "lit"],
  ["/repo/node_modules/@genexus/kasstor-core", "@genexus/kasstor-core"],
  ["/repo/node_modules/@genexus/kasstor-webkit", "@genexus/kasstor-webkit"]
];

const COVER_HITS = [
  "/repo/node_modules/@shoelace-style/shoelace/dist/components/button/button.js",
  "/repo/node_modules/@material/web/button/filled-button.ts",
  "/repo/node_modules/lit/index.js",
  "/repo/node_modules/@genexus/kasstor-core/dist/index.js"
];

const COVER_MISSES = [
  "/repo/src/components/app.lit.ts",
  "/repo/src/index.ts",
  "/repo/test/spec.ts"
];

function buildIndex(): PackageRootIndex {
  const idx = new PackageRootIndex();
  for (let i = 0; i < FAKE_ROOTS.length; i++) {
    idx.add(FAKE_ROOTS[i]![0], FAKE_ROOTS[i]![1]);
  }
  return idx;
}

describe("PackageRootIndex.cover", () => {
  const idx = buildIndex();
  const fakeFiles = [...COVER_HITS, ...COVER_MISSES].map(f => ({ fileName: f }) as ts.SourceFile);

  bench("1k mixed lookups (4 hits + 3 misses)", () => {
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < fakeFiles.length; j++) {
        idx.cover(fakeFiles[j]!);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// convertCemPackageToHtmlCollection — called once per ingested CEM
// -----------------------------------------------------------------------------

function makeCemPackage(componentCount: number): CemPackage {
  const modules: CemPackage["modules"] = [];
  for (let i = 0; i < componentCount; i++) {
    modules.push({
      kind: "javascript-module",
      path: `src/comp-${i}.ts`,
      declarations: [
        {
          kind: "class",
          customElement: true,
          name: `Comp${i}`,
          tagName: `bench-comp-${i}`,
          description: `Component ${i}`,
          attributes: [
            { name: "label", type: { text: "string" } },
            { name: "disabled", type: { text: "boolean" } },
            { name: "size", type: { text: "'small' | 'medium' | 'large'" } }
          ],
          members: [
            { kind: "field", name: "label", type: { text: "string" }, attribute: "label" },
            { kind: "field", name: "disabled", type: { text: "boolean" }, attribute: "disabled" },
            { kind: "method", name: "focus" }
          ],
          events: [{ name: "bench-change", type: { text: "CustomEvent<number>" } }],
          slots: [{ name: "" }, { name: "icon" }],
          cssParts: [{ name: "base" }, { name: "label" }],
          cssProperties: [{ name: "--bg" }, { name: "--fg" }]
        }
      ]
    });
  }
  return { schemaVersion: "2.1.0", modules };
}

describe("convertCemPackageToHtmlCollection", () => {
  const pkg10 = makeCemPackage(10);
  const pkg100 = makeCemPackage(100);

  bench("CEM package with 10 components", () => {
    convertCemPackageToHtmlCollection(pkg10, { sourceName: "bench" });
  });

  bench("CEM package with 100 components", () => {
    convertCemPackageToHtmlCollection(pkg100, { sourceName: "bench" });
  });
});

// -----------------------------------------------------------------------------
// convertKasstorSummaryToCem — called once per kasstor library summary load
// -----------------------------------------------------------------------------

function makeKasstorSummary(componentCount: number): ComponentDefinition[] {
  const out: ComponentDefinition[] = [];
  for (let i = 0; i < componentCount; i++) {
    out.push({
      access: "public",
      tagName: `kst-bench-${i}`,
      className: `KstBench${i}`,
      description: `Bench component ${i}`,
      fullClassJSDoc: "",
      srcPath: `components/bench-${i}.lit.ts`,
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      properties: [
        { name: "label", type: "string", attribute: "label", default: "" },
        { name: "disabled", type: "boolean", attribute: "disabled", default: "false" }
      ],
      events: [
        { name: "kst-change", detailType: "number", bubbles: true, composed: true }
      ],
      methods: [{ name: "focus", paramTypes: [], returnType: "void" }],
      parts: [{ name: "base" }],
      slots: [{ name: "" }],
      cssVariables: [{ name: "--bg" }]
    });
  }
  return out;
}

describe("convertKasstorSummaryToCem", () => {
  const summary50 = makeKasstorSummary(50);

  bench("Kasstor library summary with 50 components", () => {
    convertKasstorSummaryToCem(summary50);
  });
});

// -----------------------------------------------------------------------------
// refineGenericTagTypesInScope — called once per analyzed source file
// -----------------------------------------------------------------------------

const TS_OPTS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  experimentalDecorators: true,
  lib: ["lib.dom.d.ts", "lib.es2022.d.ts"],
  noEmit: true,
  skipLibCheck: true
};

const GENERIC_FIXTURE = `
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

export class GenericElement<T> extends LitElement {
  @property() key!: keyof T;
}

@customElement("generic-specific")
export class GenericSpecific extends GenericElement<{ id: number; name: string }> {}

declare global {
  interface HTMLElementTagNameMap {
    "generic-specific": GenericElement<{ id: number; name: string }>;
  }
}
`;

function makeProgram(text: string): ts.Program {
  const sf = ts.createSourceFile("/virtual/x.ts", text, ts.ScriptTarget.ES2022, true);
  const host = ts.createCompilerHost(TS_OPTS, true);
  const orig = host.getSourceFile;
  host.getSourceFile = (n, l, e, c) => (n === "/virtual/x.ts" ? sf : orig.call(host, n, l, e, c));
  host.fileExists = n => n === "/virtual/x.ts" || ts.sys.fileExists(n);
  host.readFile = n => (n === "/virtual/x.ts" ? text : ts.sys.readFile(n));
  return ts.createProgram(["/virtual/x.ts"], TS_OPTS, host);
}

describe("refineGenericTagTypesInScope", () => {
  const program = makeProgram(GENERIC_FIXTURE);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile("/virtual/x.ts")!;

  // Pre-populate a synthetic htmlStore-like map.
  const tags = new Map<string, HtmlTag>();
  tags.set("generic-specific", {
    tagName: "generic-specific",
    attributes: [],
    properties: [],
    events: [],
    slots: [],
    cssParts: [],
    cssProperties: []
  });

  bench("refine on a single generic instantiation", () => {
    refineGenericTagTypesInScope(name => tags.get(name), sf, checker);
  });
});
