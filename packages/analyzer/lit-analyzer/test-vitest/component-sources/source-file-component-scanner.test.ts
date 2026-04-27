import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { SourceFileComponentScanner } from "../../src/lib/analyze/component-sources/source-file-component-scanner.js";

/**
 * Unit tests for the native scanner that replaced the
 * `web-component-analyzer` runtime. Each case exercises one of the
 * patterns the scanner is responsible for recognising — the WCA-removal
 * branch documented these as the floor of supported source-file shapes.
 */

function makeProgram(text: string, fileName = "/virtual/test.ts"): {
  program: ts.Program;
  sourceFile: ts.SourceFile;
} {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ESNext, true);
  const opts: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    lib: ["lib.dom.d.ts", "lib.esnext.d.ts"],
    experimentalDecorators: true,
    strict: true,
    noEmit: true
  };
  const host = ts.createCompilerHost(opts, true);
  const orig = host.getSourceFile;
  host.getSourceFile = (n, lang, onError, shouldCreate) =>
    n === fileName ? sf : orig.call(host, n, lang, onError, shouldCreate);
  host.fileExists = n => n === fileName || ts.sys.fileExists(n);
  host.readFile = n => (n === fileName ? text : ts.sys.readFile(n));
  const program = ts.createProgram({ rootNames: [fileName], options: opts, host });
  return { program, sourceFile: program.getSourceFile(fileName)! };
}

function makeScanner(program: ts.Program): SourceFileComponentScanner {
  return new SourceFileComponentScanner({
    ts,
    getProgram: () => program,
    getChecker: () => program.getTypeChecker()
  });
}

describe("SourceFileComponentScanner: customElements.define", () => {
  it("registers a tag from `customElements.define('tag', Class)`", () => {
    const { program, sourceFile } = makeProgram(
      `class MyEl extends HTMLElement {}; customElements.define('my-el', MyEl);`
    );
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions.map(d => d.tagName)).toEqual(["my-el"]);
    expect(result.componentDefinitions[0]?.declaration).toBeDefined();
  });

  it("ignores customElements.define calls without a string literal", () => {
    const { program, sourceFile } = makeProgram(
      `class MyEl extends HTMLElement {}; const t = "x"; customElements.define(t, MyEl);`
    );
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions).toHaveLength(0);
  });
});

describe("SourceFileComponentScanner: @customElement decorator", () => {
  it("registers a tag from `@customElement('tag') class …`", () => {
    const { program, sourceFile } = makeProgram(`
      function customElement(name: string) { return (target: unknown) => target; }
      @customElement('my-deco-el')
      class MyDecoEl extends HTMLElement {}
    `);
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions.map(d => d.tagName)).toEqual(["my-deco-el"]);
  });
});

describe("SourceFileComponentScanner: HTMLElementTagNameMap", () => {
  it("registers tags from interface declarations", () => {
    const { program, sourceFile } = makeProgram(`
      class MyEl extends HTMLElement {}
      declare global {
        interface HTMLElementTagNameMap {
          "map-el": MyEl;
        }
      }
    `);
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions.map(d => d.tagName)).toContain("map-el");
  });

  it("merges customElements.define and HTMLElementTagNameMap into one definition with both nodes", () => {
    const { program, sourceFile } = makeProgram(`
      class MyEl extends HTMLElement {}
      customElements.define("my-el", MyEl);
      declare global {
        interface HTMLElementTagNameMap {
          "my-el": MyEl;
        }
      }
    `);
    const result = makeScanner(program).scan(sourceFile);
    const def = result.componentDefinitions.find(d => d.tagName === "my-el");
    expect(def, "definition for my-el should exist exactly once").toBeDefined();
    expect(result.componentDefinitions.filter(d => d.tagName === "my-el")).toHaveLength(1);
    expect(def!.tagNameNodes.size).toBe(2);
  });
});

describe("SourceFileComponentScanner: @property / @state members", () => {
  it("emits attribute + property pairs for @property() fields", () => {
    const { program, sourceFile } = makeProgram(`
      function property(opts?: unknown): PropertyDecorator { return () => {}; }
      class MyEl extends HTMLElement {
        @property() label: string = "";
      }
      customElements.define("my-prop", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const kinds = decl.members.map(m => `${m.kind}:${m.kind === "attribute" ? m.attrName : m.propName}`);
    expect(kinds).toContain("attribute:label");
    expect(kinds).toContain("property:label");
  });

  it("treats @state() members as protected single-property entries (no attribute)", () => {
    const { program, sourceFile } = makeProgram(`
      function state(): PropertyDecorator { return () => {}; }
      class MyEl extends HTMLElement {
        @state() open: boolean = false;
      }
      customElements.define("my-state", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const open = decl.members.find(m => m.kind === "property" && m.propName === "open");
    expect(open?.visibility).toBe("protected");
    expect(decl.members.filter(m => m.kind === "attribute" && m.attrName === "open")).toHaveLength(0);
  });

  it("captures `attribute: 'foo-bar'` rename from the @property config", () => {
    const { program, sourceFile } = makeProgram(`
      function property(opts?: unknown): PropertyDecorator { return () => {}; }
      class MyEl extends HTMLElement {
        @property({ attribute: "foo-bar" }) fooBar: string = "";
      }
      customElements.define("my-rename", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const attr = decl.members.find(m => m.kind === "attribute") as
      | { attrName: string; meta?: { attribute?: string | boolean } }
      | undefined;
    expect(attr?.attrName).toBe("foo-bar");
    expect(attr?.meta?.attribute).toBe("foo-bar");
  });

  it("drops the attribute half when @property({ attribute: false })", () => {
    const { program, sourceFile } = makeProgram(`
      function property(opts?: unknown): PropertyDecorator { return () => {}; }
      class MyEl extends HTMLElement {
        @property({ attribute: false }) data: object = {};
      }
      customElements.define("my-noattr", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    expect(decl.members.some(m => m.kind === "attribute" && m.attrName === "data")).toBe(false);
    expect(decl.members.some(m => m.kind === "property" && m.propName === "data")).toBe(true);
  });
});

describe("SourceFileComponentScanner: visibility", () => {
  it("derives visibility from TS modifiers", () => {
    const { program, sourceFile } = makeProgram(`
      class MyEl extends HTMLElement {
        public a: string = "";
        private b: string = "";
        protected c: string = "";
      }
      customElements.define("my-vis", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const byName = Object.fromEntries(
      decl.members
        .filter(m => m.kind === "property")
        .map(m => [(m as { propName: string }).propName, m.visibility])
    );
    expect(byName.a).toBe("public");
    expect(byName.b).toBe("private");
    expect(byName.c).toBe("protected");
  });

  it("treats `#name` private fields as private", () => {
    const { program, sourceFile } = makeProgram(`
      class MyEl extends HTMLElement {
        #secret: string = "";
      }
      customElements.define("my-priv", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const secret = decl.members.find(m => m.kind === "property" && m.propName === "#secret");
    expect(secret?.visibility).toBe("private");
  });
});

describe("SourceFileComponentScanner: Lit < 2 `static get properties()`", () => {
  it("translates static getter entries into ComponentMember pairs", () => {
    const { program, sourceFile } = makeProgram(`
      class MyEl extends HTMLElement {
        static get properties() {
          return { color: { type: String }, count: { type: Number } };
        }
      }
      customElements.define("my-legacy", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    const attrs = decl.members.filter(m => m.kind === "attribute").map(m => m.attrName);
    const props = decl.members.filter(m => m.kind === "property").map(m => (m as { propName: string }).propName);
    expect(attrs).toContain("color");
    expect(attrs).toContain("count");
    expect(props).toContain("color");
    expect(props).toContain("count");
  });
});

describe("SourceFileComponentScanner: implicit candidates", () => {
  it("synthesises a definition from an `@element` JSDoc tag", () => {
    const { program, sourceFile } = makeProgram(`
      function property(): PropertyDecorator { return () => {}; }
      /**
       * @element
       */
      class MyImplicit extends HTMLElement {
        @property() name: string = "";
      }
    `);
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions.map(d => d.tagName)).toContain("my-implicit");
  });

  it("synthesises a definition from a class with @property decorators (no explicit tag)", () => {
    const { program, sourceFile } = makeProgram(`
      function property(): PropertyDecorator { return () => {}; }
      class MyOther extends HTMLElement {
        @property() label: string = "";
      }
    `);
    const result = makeScanner(program).scan(sourceFile);
    expect(result.componentDefinitions.map(d => d.tagName)).toContain("my-other");
  });
});

describe("SourceFileComponentScanner: JSDoc class-level tags", () => {
  it("extracts @slot, @csspart, @cssprop, @event into the declaration", () => {
    const { program, sourceFile } = makeProgram(`
      /**
       * @slot - default slot
       * @slot icon - the icon slot
       * @csspart container - root container
       * @cssprop --my-color - main color
       * @event {CustomEvent} my-event - emits when clicked
       */
      class MyEl extends HTMLElement {}
      customElements.define("my-jsdoc", MyEl);
    `);
    const decl = makeScanner(program).scan(sourceFile).componentDefinitions[0]!.declaration!;
    expect(decl.slots.length).toBeGreaterThanOrEqual(2);
    expect(decl.cssParts.map(p => p.name)).toContain("container");
    expect(decl.cssProperties.map(p => p.name)).toContain("--my-color");
    expect(decl.events.map(e => e.name)).toContain("my-event");
  });
});
