import { describe, expect, it } from "vitest";

import { getComponentDeclaration } from "../index.js";
import { makeComponent, makeEvent, makeMethod, makeProperty } from "./fixtures.js";

describe("[component-declaration-file] getComponentDeclaration", () => {
  it("returns the placeholder comment when there are no components", () => {
    expect(getComponentDeclaration([])).toMatchSnapshot();
  });

  it("renders a bare component with only the required fields", () => {
    const components = [
      makeComponent({
        tagName: "kst-divider",
        className: "KstDivider",
        srcPath: "./kst-divider.lit.ts",
        fullClassJSDoc: "/**\n * A divider.\n */"
      })
    ];

    expect(getComponentDeclaration(components)).toMatchSnapshot();
  });

  it("renders a fully-featured component (properties, events, imported types and JSDoc)", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        srcPath: "./kst-field.lit.ts",
        fullClassJSDoc:
          "/**\n * A form field with validation.\n *\n * @part input - The input element.\n */",
        properties: [
          makeProperty({ name: "value", description: "The current value." }),
          makeProperty({
            name: "variant",
            type: "FieldVariant",
            description: "Visual variant.",
            required: true
          })
        ],
        events: [makeEvent({ name: "change", description: "Fires when the value changes." })],
        // Methods do not emit signatures into components.ts; only the types
        // they reference (methodImportTypes) reach the import header.
        methods: [
          makeMethod({
            name: "focusField",
            paramTypes: [{ name: "options", type: "FocusFieldOptions" }]
          })
        ],
        propertyImportTypes: { "./types.js": ["FieldVariant"] },
        methodImportTypes: { "./types.js": ["FocusFieldOptions"] }
      })
    ];

    expect(getComponentDeclaration(components)).toMatchSnapshot();
  });

  it("renders a multi-component library (locking section ordering and the in-place import sort)", () => {
    const components = [
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        srcPath: "./kst-icon.lit.ts",
        fullClassJSDoc: "/**\n * An icon.\n */",
        properties: [makeProperty({ name: "name" })]
      }),
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        srcPath: "./kst-field.lit.ts",
        fullClassJSDoc: "/**\n * A form field.\n */",
        properties: [makeProperty({ name: "value" })],
        events: [makeEvent({ name: "change", description: "Value changed." })]
      })
    ];

    expect(getComponentDeclaration(components)).toMatchSnapshot();
  });
});
