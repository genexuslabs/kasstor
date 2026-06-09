import { describe, expect, it } from "vitest";

import {
  getComponentFrameworkType,
  getCoreModuleSpecifier,
  getIntrinsicElementsInterface,
  getReactDeclaration,
  getSolidDeclaration,
  getStencilDeclaration
} from "../get-framework-types.js";
import { makeComponent, makeEvent, makeProperty } from "./fixtures.js";

describe("[component-declaration-file] getCoreModuleSpecifier", () => {
  it("turns a .ts core file name into a relative .js specifier", () => {
    expect(getCoreModuleSpecifier("components.ts")).toBe("./components.js");
  });

  it("turns a .js core file name into a relative .js specifier", () => {
    expect(getCoreModuleSpecifier("components.js")).toBe("./components.js");
  });

  it("handles an extensionless core file name", () => {
    expect(getCoreModuleSpecifier("components")).toBe("./components.js");
  });

  it("respects a custom core file name", () => {
    expect(getCoreModuleSpecifier("kasstor-types.ts")).toBe("./kasstor-types.js");
  });
});

// A component with: a property, one native event (input) and one custom event
// (selectedItemsChange) — exercises the per-framework attribute intersection,
// the native-event delegation and the custom-event naming rules.
const richComponent = () =>
  makeComponent({
    tagName: "kst-field",
    className: "KstField",
    fullClassJSDoc: "/**\n * A form field.\n */",
    properties: [makeProperty({ name: "value" })],
    events: [
      makeEvent({ name: "input", description: "Native input event." }),
      makeEvent({
        name: "selectedItemsChange",
        description: "Selection changed."
      })
    ]
  });

describe("[component-declaration-file] getComponentFrameworkType", () => {
  it("omits component props + the re-typed native handler from React HTMLAttributes and names every event", () => {
    const result = getComponentFrameworkType(richComponent(), "react");

    // Props come from the re-declared `ComponentPropertiesReact` namespace (not a
    // `Pick<>` of the class), and the re-typed native handler (`onInput`) is
    // omitted from the base attributes so the component's handler wins.
    expect(result).toContain(
      'Omit<ReactDetailedHTMLProps<ReactHTMLAttributes<HTMLKstFieldElement>, HTMLKstFieldElement>, keyof ComponentPropertiesReact.KstField | "onInput">'
    );
    // The props namespace is used as-is (no `Partial<>` wrapper).
    expect(result).toContain("& ComponentPropertiesReact.KstField &");
    // Native event re-typed under React's own handler prop name.
    expect(result).toContain("onInput?:");
    // Custom event: verbatim `on` + name.
    expect(result).toContain("onselectedItemsChange?:");
    expect(result).toMatchSnapshot();
  });

  it("uses JSXBase.HTMLAttributes and a capitalized custom event name for StencilJS", () => {
    const result = getComponentFrameworkType(richComponent(), "stencil");

    expect(result).toContain(
      "Omit<JSXBase.HTMLAttributes<HTMLKstFieldElement>, keyof ComponentProperties.KstField>"
    );
    expect(result).toContain("onSelectedItemsChange?:");
    expect(result).not.toContain("onInput");
    expect(result).toMatchSnapshot();
  });

  it('uses Solid JSX.HTMLAttributes and the "on:" prefix for every event', () => {
    const result = getComponentFrameworkType(richComponent(), "solid");

    expect(result).toContain(
      "Omit<JSX.HTMLAttributes<HTMLKstFieldElement>, keyof ComponentPropertiesSolidJS.KstField>"
    );
    // SolidJS keeps every event (native + custom), verbatim, via "on:".
    expect(result).toContain('"on:selectedItemsChange"?:');
    expect(result).toContain('"on:input"?:');
    expect(result).toMatchSnapshot();
  });

  it("terminates the alias without an event block when the component has no events", () => {
    const component = makeComponent({
      className: "KstIcon",
      properties: [makeProperty({ name: "name" })]
    });

    const result = getComponentFrameworkType(component, "react");

    expect(result).not.toContain("&\n");
    expect(result.endsWith(";")).toBe(true);
    expect(result).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getIntrinsicElementsInterface", () => {
  it("maps tag names to JSX types with class JSDoc and @fires tags", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        events: [makeEvent({ name: "selectedItemsChange", description: "Changed." })]
      }),
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        fullClassJSDoc: "/**\n * An icon.\n */"
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });
});

const library = () => [
  richComponent(),
  makeComponent({
    tagName: "kst-icon",
    className: "KstIcon",
    fullClassJSDoc: "/**\n * An icon.\n */",
    properties: [makeProperty({ name: "name" })]
  })
];

describe("[component-declaration-file] getReactDeclaration", () => {
  it("declares ComponentPropertiesReact locally (no core ComponentProperties import) and augments react's IntrinsicElements", () => {
    const result = getReactDeclaration(library(), "components.ts");

    // The namespace is declared in this file, not imported from the core file.
    expect(result).toContain("export namespace ComponentPropertiesReact {");
    expect(result).not.toContain('import type { ComponentProperties } from "./components.js"');
    // No property import types in this library -> no import from the core file.
    expect(result).not.toContain('from "./components.js"');
    expect(result).toMatchSnapshot();
  });

  it("imports the property types from the core file when properties use imported types", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        properties: [makeProperty({ name: "variant", type: "FieldVariant" })],
        propertyImportTypes: { "./types.js": ["FieldVariant"] }
      })
    ];

    const result = getReactDeclaration(components, "components.ts");

    expect(result).toContain('import type { FieldVariant } from "./components.js";');
    expect(result).toContain("export namespace ComponentPropertiesReact {");
    expect(result).toContain("variant?: FieldVariant;");
    expect(result).toMatchSnapshot();
  });

  it("uses the configured core file name in the import specifier", () => {
    const components = [
      makeComponent({
        className: "KstField",
        properties: [makeProperty({ name: "variant", type: "FieldVariant" })],
        propertyImportTypes: { "./types.js": ["FieldVariant"] }
      })
    ];

    expect(getReactDeclaration(components, "kasstor-types.ts")).toContain(
      'from "./kasstor-types.js"'
    );
  });

  it("returns a placeholder comment when there are no components", () => {
    expect(getReactDeclaration([], "components.ts")).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getSolidDeclaration", () => {
  it("declares ComponentPropertiesSolidJS locally (no dangling core import) and augments solid-js JSX", () => {
    const result = getSolidDeclaration(library(), "components.ts");

    // The namespace is declared in this file, not imported from the core file.
    expect(result).toContain("export namespace ComponentPropertiesSolidJS {");
    expect(result).not.toContain(
      'import type { ComponentPropertiesSolidJS } from "./components.js"'
    );
    // No property import types in this library -> no import from the core file.
    expect(result).not.toContain('from "./components.js"');
    expect(result).toMatchSnapshot();
  });

  it("imports the property types from the core file when properties use imported types", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        properties: [makeProperty({ name: "variant", type: "FieldVariant" })],
        propertyImportTypes: { "./types.js": ["FieldVariant"] }
      })
    ];

    const result = getSolidDeclaration(components, "components.ts");

    expect(result).toContain('import type { FieldVariant } from "./components.js";');
    expect(result).toContain("export namespace ComponentPropertiesSolidJS {");
    expect(result).toContain('"prop:variant"?: FieldVariant;');
    expect(result).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getStencilDeclaration", () => {
  it("imports @stencil/core + the core ComponentProperties and augments Stencil JSX", () => {
    expect(getStencilDeclaration(library(), "components.ts")).toMatchSnapshot();
  });
});
