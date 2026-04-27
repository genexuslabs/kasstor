import { describe, it, expect, afterEach } from "vitest";
import { createPluginHost, htmlStoreOf, type PluginHandle } from "./helpers/plugin-host.js";

let active: PluginHandle | undefined;
afterEach(() => {
  active?.dispose();
  active = undefined;
});

function withSource(source: string, config?: Record<string, unknown>) {
  active = createPluginHost({ source, config });
  return active;
}

describe("bundled plugin: smoke", () => {
  it("plugin.create succeeds and decorates the LanguageService", () => {
    const handle = withSource(`const _x = 1;`);
    expect(typeof handle.decorated.getCompletionsAtPosition).toBe("function");
    expect(typeof handle.decorated.getSemanticDiagnostics).toBe("function");
    expect(typeof handle.decorated.getQuickInfoAtPosition).toBe("function");
    expect(typeof handle.decorated.getDefinitionAndBoundSpan).toBe("function");
  });

  it("__tsHtmlPlugin__ symbol is attached", () => {
    const handle = withSource(`const _x = 1;`);
    expect(handle.decorated[Symbol.for("__tsHtmlPlugin__")]).toBeTruthy();
  });
});

describe("bundled plugin: kasstor library-summary ingestion (cold-load path)", () => {
  it("absorbs every component from the fixture summary into htmlStore on first analysis", () => {
    const handle = withSource(`
      import { html } from "lit";
      const _ = html\`<kst-button label="Hi"></kst-button>\`;
    `);
    // First call triggers `ensureExternalsLoaded` → KasstorSummarySource.load.
    handle.decorated.getSemanticDiagnostics(handle.fileName);
    const tag = htmlStoreOf(handle).getHtmlTag("kst-button");
    expect(tag, "expected `kst-button` to be registered from library-summary").toBeTruthy();
  });

  it("preserves the description authored in library-summary", () => {
    const handle = withSource(`const _ = "noop";`);
    handle.decorated.getSemanticDiagnostics(handle.fileName);
    const tag = htmlStoreOf(handle).getHtmlTag("kst-button") as
      | { description?: string }
      | undefined;
    expect(tag?.description).toContain("test button component");
  });

  it("returns no kasstor manifests when kasstorSummary is disabled", () => {
    const handle = withSource(`const _ = "noop";`, { kasstorSummary: false });
    handle.decorated.getSemanticDiagnostics(handle.fileName);
    const tag = htmlStoreOf(handle).getHtmlTag("kst-button");
    expect(tag).toBeFalsy();
  });
});

describe("bundled plugin: diagnostics", () => {
  it("flags unknown tags inside lit templates", () => {
    const handle = withSource(`
      import { html } from "lit";
      const _ = html\`<not-a-real-element></not-a-real-element>\`;
    `);
    const diags = handle.decorated.getSemanticDiagnostics(handle.fileName) as Array<{
      source?: string;
      messageText: string | { messageText: string };
    }>;
    const messages = diags.map(d =>
      typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
    );
    expect(messages.some(m => m.includes("Unknown tag <not-a-real-element>"))).toBe(true);
  });

  it("flags unknown attributes on kasstor tags", () => {
    const handle = withSource(`
      import { html } from "lit";
      const _ = html\`<kst-button bogus="x"></kst-button>\`;
    `);
    const diags = handle.decorated.getSemanticDiagnostics(handle.fileName) as Array<{
      source?: string;
      messageText: string | { messageText: string };
    }>;
    const messages = diags.map(d =>
      typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
    );
    expect(messages.some(m => m.includes("Unknown attribute 'bogus'"))).toBe(true);
  });

  it("does not flag known kasstor attributes", () => {
    const handle = withSource(`
      import { html } from "lit";
      const _ = html\`<kst-button disabled label="Hi"></kst-button>\`;
    `);
    const diags = handle.decorated.getSemanticDiagnostics(handle.fileName) as Array<{
      source?: string;
      messageText: string | { messageText: string };
    }>;
    const messages = diags.map(d =>
      typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
    );
    expect(messages.filter(m => m.includes("Unknown attribute"))).toHaveLength(0);
    expect(messages.filter(m => m.includes("Unknown tag"))).toHaveLength(0);
  });
});

describe("bundled plugin: completions", () => {
  it("offers kasstor attribute completions inside an opening tag", () => {
    const source = `
      import { html } from "lit";
      const _ = html\`<kst-button   ></kst-button>\`;
    `;
    const handle = withSource(source);
    // Cursor positioned on the second space inside the opening tag, where
    // an attribute completion would naturally trigger.
    const cursor = source.indexOf("<kst-button   ") + "<kst-button  ".length;
    const completions = handle.decorated.getCompletionsAtPosition(
      handle.fileName,
      cursor,
      undefined
    ) as { entries?: Array<{ name: string }> } | undefined;
    const names = (completions?.entries ?? []).map(e => e.name);
    expect(names, JSON.stringify(names.slice(0, 12))).toContain("disabled");
    expect(names).toContain("label");
  });

  it("offers property completions after `.`", () => {
    const source = `
      import { html } from "lit";
      const _ = html\`<kst-button .></kst-button>\`;
    `;
    const handle = withSource(source);
    const cursor = source.indexOf(".>") + 1;
    const completions = handle.decorated.getCompletionsAtPosition(
      handle.fileName,
      cursor,
      undefined
    ) as { entries?: Array<{ name: string }> } | undefined;
    const names = (completions?.entries ?? []).map(e => e.name);
    expect(names.some(n => n === ".disabled" || n === ".label")).toBe(true);
  });

  it("offers event completions after `@`", () => {
    const source = `
      import { html } from "lit";
      const _ = html\`<kst-button @></kst-button>\`;
    `;
    const handle = withSource(source);
    const cursor = source.indexOf("@>") + 1;
    const completions = handle.decorated.getCompletionsAtPosition(
      handle.fileName,
      cursor,
      undefined
    ) as { entries?: Array<{ name: string }> } | undefined;
    const names = (completions?.entries ?? []).map(e => e.name);
    expect(names.some(n => n.includes("buttonClick"))).toBe(true);
  });
});

describe("bundled plugin: regression — kasstor-summary preserved across cases that exposed the empty-overwrite bug", () => {
  // The user's chameleon repro had Cursor's tsserver pass a lower-case
  // drive-letter program root (`d:/...`) while TS source files came back
  // with the canonical upper-case (`D:/...`). The case mismatch made
  // `PackageRootIndex.cover` falsely report files as "not covered" by
  // the kasstor library-summary, so the source-file scanner ran over
  // each `.lit.ts` and registered an empty tag entry from the
  // auto-generated `interface HTMLElementTagNameMap { … }` block —
  // clobbering the 12 attrs / 12 props the manifest had just absorbed.
  // These tests pin both the case-folding fix in `PackageRootIndex` and
  // the defense-in-depth empty-tag filter in `SourceFileSource`.

  it("retains rich kasstor-summary data when programRoot uses lower-case drive letter", () => {
    const handle = withSource(
      `
      import { html } from "lit";
      // Force the program to import the .lit.ts file that contains the
      // auto-generated HTMLElementTagNameMap block — this is the very
      // file the source-file scanner used to clobber.
      import "./components/nav-item/nav-item.lit.js";
      const _ = html\`<kst-nav-item .caption=\${"hi"} .level=\${1}></kst-nav-item>\`;
    `
    );
    handle.decorated.getSemanticDiagnostics(handle.fileName);
    const tag = htmlStoreOf(handle).getHtmlTag("kst-nav-item") as
      | { attributes: unknown[]; properties: unknown[]; description?: string }
      | undefined;
    expect(tag, "tag must be registered").toBeTruthy();
    expect(tag!.attributes.length, "attrs must come from the library-summary").toBe(2);
    expect(tag!.properties.length, "props must come from the library-summary").toBe(2);
    expect(tag!.description).toContain("regression suite");
  });

  it("does not flag known kasstor properties as `Unknown property` even when both sources claim the tag", () => {
    const handle = withSource(
      `
      import { html } from "lit";
      import "./components/nav-item/nav-item.lit.js";
      const _ = html\`<kst-nav-item .caption=\${"hi"} .level=\${1}></kst-nav-item>\`;
    `
    );
    const diags = handle.decorated.getSemanticDiagnostics(handle.fileName) as Array<{
      source?: string;
      messageText: string | { messageText: string };
    }>;
    const messages = diags.map(d =>
      typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
    );
    expect(
      messages.filter(m => /Unknown property '(caption|level)'/.test(m)),
      JSON.stringify(messages)
    ).toHaveLength(0);
  });
});

describe("bundled plugin: quick info / hover", () => {
  it("returns hover info for the tag name with the kasstor description", () => {
    const source = `
      import { html } from "lit";
      const _ = html\`<kst-button></kst-button>\`;
    `;
    const handle = withSource(source);
    const cursor = source.indexOf("kst-button") + 2;
    const qi = handle.decorated.getQuickInfoAtPosition(handle.fileName, cursor) as
      | { displayParts?: Array<{ text: string }>; documentation?: Array<{ text: string }> }
      | undefined;
    expect(qi).toBeTruthy();
    const display = qi?.displayParts?.map(p => p.text).join("") ?? "";
    expect(display).toContain("kst-button");
  });
});
