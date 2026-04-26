import { describe, expect, it } from "vitest";
import { convertCemPackageToHtmlCollection } from "../../src/lib/analyze/parse/parse-cem-collection.js";
import type { CemPackage } from "../../src/lib/analyze/component-sources/cem-types.js";

const SAMPLE_MANIFEST: CemPackage = {
  schemaVersion: "2.1.0",
  modules: [
    {
      kind: "javascript-module",
      path: "src/x-card.ts",
      declarations: [
        {
          kind: "class",
          name: "XCard",
          customElement: true,
          tagName: "x-card",
          description: "A card.",
          attributes: [
            { name: "header", type: { text: "string" } },
            { name: "open", type: { text: "boolean" } }
          ],
          members: [
            {
              kind: "field",
              name: "value",
              type: { text: "number" },
              attribute: "value"
            },
            {
              kind: "field",
              name: "internal",
              type: { text: "string" },
              privacy: "private"
            }
          ],
          events: [{ name: "x-change", type: { text: "CustomEvent<number>" } }],
          slots: [{ name: "" }, { name: "header" }],
          cssParts: [{ name: "wrapper" }],
          cssProperties: [{ name: "--x-card-bg" }]
        }
      ]
    }
  ]
};

describe("convertCemPackageToHtmlCollection", () => {
  it("emits one HtmlTag per CEM custom element with tagName", () => {
    const collection = convertCemPackageToHtmlCollection(SAMPLE_MANIFEST, { sourceName: "test" });
    expect(collection.tags).toHaveLength(1);
    expect(collection.tags[0]?.tagName).toBe("x-card");
    expect(collection.tags[0]?.description).toBe("A card.");
  });

  it("collects attributes from both attributes[] and field-with-attribute members", () => {
    const collection = convertCemPackageToHtmlCollection(SAMPLE_MANIFEST, { sourceName: "test" });
    const attrs = collection.tags[0]!.attributes.map(a => a.name).sort();
    expect(attrs).toEqual(["header", "open", "value"].sort());
  });

  it("does NOT emit private fields as properties", () => {
    const collection = convertCemPackageToHtmlCollection(SAMPLE_MANIFEST, { sourceName: "test" });
    const props = collection.tags[0]!.properties.map(p => p.name);
    expect(props).toContain("value");
    expect(props).not.toContain("internal");
  });

  it("emits events with their name and a getType() callback", () => {
    const collection = convertCemPackageToHtmlCollection(SAMPLE_MANIFEST, { sourceName: "test" });
    const events = collection.tags[0]!.events;
    expect(events).toHaveLength(1);
    expect(events[0]!.name).toBe("x-change");
    // CustomEvent<number> isn't one of our recognized primitives -> ANY
    expect(events[0]!.getType().kind).toBe("ANY");
  });

  it("emits slots, cssParts and cssProperties", () => {
    const collection = convertCemPackageToHtmlCollection(SAMPLE_MANIFEST, { sourceName: "test" });
    const tag = collection.tags[0]!;
    expect(tag.slots.map(s => s.name).sort()).toEqual(["", "header"]);
    expect(tag.cssParts.map(p => p.name)).toEqual(["wrapper"]);
    expect(tag.cssProperties.map(p => p.name)).toEqual(["--x-card-bg"]);
  });

  it("skips classes without tagName (non-custom-elements or undefined)", () => {
    const noTag: CemPackage = {
      schemaVersion: "2.1.0",
      modules: [
        {
          kind: "javascript-module",
          path: "src/x.ts",
          declarations: [
            {
              kind: "class",
              name: "Helper",
              description: "Just a class, not a custom element."
            }
          ]
        }
      ]
    };
    const collection = convertCemPackageToHtmlCollection(noTag, { sourceName: "test" });
    expect(collection.tags).toHaveLength(0);
  });

  it("returns SimpleType STRING for type.text='string'", () => {
    const m: CemPackage = {
      schemaVersion: "2.1.0",
      modules: [
        {
          kind: "javascript-module",
          path: "x.ts",
          declarations: [
            {
              kind: "class",
              name: "X",
              customElement: true,
              tagName: "x-x",
              attributes: [{ name: "a", type: { text: "string" } }]
            }
          ]
        }
      ]
    };
    const collection = convertCemPackageToHtmlCollection(m, { sourceName: "t" });
    expect(collection.tags[0]!.attributes[0]!.getType().kind).toBe("STRING");
  });
});
