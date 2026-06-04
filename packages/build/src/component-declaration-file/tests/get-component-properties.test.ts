import { describe, expect, it } from "vitest";

import {
  getComponentBaseClass,
  getComponentProperties,
  getComponentPropertiesSolidJS,
  getComponentPropertiesUnionType,
  getComponentPropertiesUnionTypeSolidJS
} from "../get-component-properties-union-type.js";
import { makeComponent, makeProperty } from "./fixtures.js";

describe("[component-declaration-file] getComponentBaseClass", () => {
  it("maps each tag name to its `Element`-suffixed class", () => {
    const components = [
      makeComponent({ tagName: "kst-a", className: "KstA" }),
      makeComponent({ tagName: "kst-b", className: "KstB" })
    ];

    expect(getComponentBaseClass(components)).toMatchSnapshot();
  });
});

// React/JSX representation: a `Pick<...Element, "name">` of the class.
describe("[component-declaration-file] getComponentPropertiesUnionType (React/JSX)", () => {
  it("returns `{}` when there are no properties", () => {
    expect(getComponentPropertiesUnionType(makeComponent())).toBe("{}");
  });

  it("returns `{}` when the properties array is empty", () => {
    expect(getComponentPropertiesUnionType(makeComponent({ properties: [] }))).toBe("{}");
  });

  it("picks a single property from the class", () => {
    const component = makeComponent({
      className: "KstField",
      properties: [makeProperty({ name: "value" })]
    });

    expect(getComponentPropertiesUnionType(component)).toBe(`Pick<KstFieldElement, "value">`);
  });

  it("picks multiple properties from the class", () => {
    const component = makeComponent({
      className: "KstField",
      properties: [
        makeProperty({ name: "value" }),
        makeProperty({ name: "disabled" }),
        makeProperty({ name: "label" })
      ]
    });

    expect(getComponentPropertiesUnionType(component)).toBe(
      `Pick<KstFieldElement, "value" | "disabled" | "label">`
    );
  });
});

// SolidJS representation: an inline object with `"prop:name"` keys.
describe("[component-declaration-file] getComponentPropertiesUnionTypeSolidJS", () => {
  it("returns `{}` when there are no properties", () => {
    expect(getComponentPropertiesUnionTypeSolidJS(makeComponent())).toBe("{}");
  });

  it("renders a single optional property with its description", () => {
    const component = makeComponent({
      properties: [
        makeProperty({
          name: "value",
          type: "string",
          description: "The current value."
        })
      ]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });

  it("omits the `?` for required properties", () => {
    const component = makeComponent({
      properties: [makeProperty({ name: "value", required: true })]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });

  it("renders multiple properties", () => {
    const component = makeComponent({
      properties: [
        makeProperty({ name: "value", type: "string" }),
        makeProperty({ name: "count", type: "number", required: true })
      ]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });

  it("indents multi-line property types", () => {
    const component = makeComponent({
      properties: [
        makeProperty({
          name: "config",
          type: "{\n  a: string;\n  b: number;\n}"
        })
      ]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });

  it("renders a property without a description as an empty JSDoc", () => {
    const component = makeComponent({
      properties: [makeProperty({ name: "value", description: undefined })]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });

  it("renders multi-line property descriptions", () => {
    const component = makeComponent({
      properties: [
        makeProperty({
          name: "value",
          description: "First line.\nSecond line."
        })
      ]
    });

    expect(getComponentPropertiesUnionTypeSolidJS(component)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getComponentProperties namespace (React/JSX)", () => {
  it("wraps every component in the `ComponentProperties` namespace", () => {
    const components = [
      makeComponent({
        className: "KstField",
        properties: [makeProperty({ name: "value" })]
      }),
      makeComponent({ className: "KstIcon" })
    ];

    expect(getComponentProperties(components)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getComponentPropertiesSolidJS namespace", () => {
  it("wraps every component in the `ComponentPropertiesSolidJS` namespace", () => {
    const components = [
      makeComponent({
        className: "KstField",
        properties: [makeProperty({ name: "value", description: "The current value." })]
      }),
      makeComponent({ className: "KstIcon" })
    ];

    expect(getComponentPropertiesSolidJS(components)).toMatchSnapshot();
  });
});
