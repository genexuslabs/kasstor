import { describe, expect, it } from "vitest";
import type { ComponentDefinition } from "@genexus/kasstor-build";
import { convertKasstorSummaryToCem } from "../../src/lib/analyze/parse/parse-kasstor-summary.js";
import { isCustomElementDeclaration } from "../../src/lib/analyze/component-sources/cem-types.js";

const SAMPLE: ComponentDefinition[] = [
  {
    access: "public",
    tagName: "kst-foo",
    className: "KstFoo",
    description: "Foo",
    fullClassJSDoc: "",
    srcPath: "components/kst-foo.lit.ts",
    developmentStatus: "stable",
    mode: "open",
    shadow: true,
    properties: [
      { name: "label", type: "string", attribute: "label", default: "" },
      { name: "internal", type: "string", attribute: false, default: "" }
    ],
    events: [
      { name: "kst-change", detailType: "number", bubbles: true, composed: true }
    ],
    methods: [{ name: "focus", paramTypes: [], returnType: "void" }],
    parts: [{ name: "base" }],
    slots: [{ name: "" }],
    cssVariables: [{ name: "--kst-foo-bg" }]
  }
];

describe("convertKasstorSummaryToCem", () => {
  it("emits one javascript-module per component, with the srcPath as path", () => {
    const pkg = convertKasstorSummaryToCem(SAMPLE);
    expect(pkg.modules).toHaveLength(1);
    expect(pkg.modules[0]!.path).toBe("components/kst-foo.lit.ts");
  });

  it("produces a CustomElementDeclaration with tagName, attributes and members", () => {
    const pkg = convertKasstorSummaryToCem(SAMPLE);
    const decl = pkg.modules[0]!.declarations![0]!;
    expect(isCustomElementDeclaration(decl)).toBe(true);
    if (!isCustomElementDeclaration(decl)) return;

    expect(decl.tagName).toBe("kst-foo");
    expect(decl.attributes?.map(a => a.name)).toEqual(["label"]);
    expect(decl.members?.map(m => m.name).sort()).toEqual(["focus", "internal", "label"].sort());
  });

  it("does NOT emit attributes for properties with attribute: false", () => {
    const pkg = convertKasstorSummaryToCem(SAMPLE);
    const decl = pkg.modules[0]!.declarations![0]!;
    if (!isCustomElementDeclaration(decl)) throw new Error("expected custom element");
    expect(decl.attributes?.find(a => a.name === "internal")).toBeUndefined();
  });

  it("appends bubbles/composed flags into the event description as a side channel", () => {
    const pkg = convertKasstorSummaryToCem(SAMPLE);
    const decl = pkg.modules[0]!.declarations![0]!;
    if (!isCustomElementDeclaration(decl)) throw new Error("expected custom element");
    expect(decl.events?.[0]!.description).toContain("bubbles");
    expect(decl.events?.[0]!.description).toContain("composed");
  });

  it("normalizes properties with attribute: false to a member field but no Attribute entry", () => {
    const pkg = convertKasstorSummaryToCem(SAMPLE, {});
    const decl = pkg.modules[0]!.declarations![0]!;
    if (!isCustomElementDeclaration(decl)) throw new Error("expected custom element");
    expect(decl.members?.find(m => m.name === "internal")).toBeDefined();
  });
});
