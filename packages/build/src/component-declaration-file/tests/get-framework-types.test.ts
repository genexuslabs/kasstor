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
  it("intersects React HTMLAttributes, omits component props, and names the custom event verbatim", () => {
    const result = getComponentFrameworkType(richComponent(), "react");

    expect(result).toContain(
      "Omit<ReactDetailedHTMLProps<ReactHTMLAttributes<HTMLKstFieldElement>, HTMLKstFieldElement>, keyof ComponentProperties.KstField>"
    );
    // Custom event: verbatim `on` + name.
    expect(result).toContain("onselectedItemsChange?:");
    // Native event delegated to React's HTMLAttributes -> not generated.
    expect(result).not.toContain("oninput");
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

  it("terminates the alias without an event block when there are no framework events", () => {
    // Only a native event -> nothing left to generate for React.
    const component = makeComponent({
      className: "KstIcon",
      properties: [makeProperty({ name: "name" })],
      events: [makeEvent({ name: "input" })]
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
  it("imports react + the core ComponentProperties and augments react's IntrinsicElements", () => {
    expect(getReactDeclaration(library(), "components.ts")).toMatchSnapshot();
  });

  it("uses the configured core file name in the import specifier", () => {
    expect(getReactDeclaration(library(), "kasstor-types.ts")).toContain(
      'from "./kasstor-types.js"'
    );
  });

  it("returns a placeholder comment when there are no components", () => {
    expect(getReactDeclaration([], "components.ts")).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getSolidDeclaration", () => {
  it("imports solid-js + the core ComponentPropertiesSolidJS and augments solid-js JSX", () => {
    expect(getSolidDeclaration(library(), "components.ts")).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getStencilDeclaration", () => {
  it("imports @stencil/core + the core ComponentProperties and augments Stencil JSX", () => {
    expect(getStencilDeclaration(library(), "components.ts")).toMatchSnapshot();
  });
});
