import { describe, expect, it } from "vitest";

import {
  getComponentLocalJSXType,
  getIntrinsicElementsInterface,
  getLocalJSXTypes,
  getSolidJsTypes
} from "../get-local-jsx-types.js";
import { makeComponent, makeEvent, makeProperty } from "./fixtures.js";

// React/JSX and SolidJS differ here in three ways:
//   - the properties namespace they reference,
//   - the children/class(Name) helper object,
//   - the event-prop naming (onXxx vs "on:xxx").
describe("[component-declaration-file] getComponentLocalJSXType", () => {
  it("references `ComponentProperties` and `className` for JSX without events", () => {
    const component = makeComponent({
      className: "KstIcon",
      properties: [makeProperty({ name: "name" })]
    });

    expect(getComponentLocalJSXType(component, "jsx")).toMatchSnapshot();
  });

  it("references `ComponentPropertiesSolidJS` and `class` for SolidJS without events", () => {
    const component = makeComponent({
      className: "KstIcon",
      properties: [makeProperty({ name: "name" })]
    });

    expect(getComponentLocalJSXType(component, "solidJs")).toMatchSnapshot();
  });

  it("appends `onXxx` event props for JSX with events", () => {
    const component = makeComponent({
      className: "KstField",
      properties: [makeProperty({ name: "value" })],
      events: [makeEvent({ name: "change", description: "Value changed." })]
    });

    expect(getComponentLocalJSXType(component, "jsx")).toMatchSnapshot();
  });

  it('appends `"on:xxx"` event props for SolidJS with events', () => {
    const component = makeComponent({
      className: "KstField",
      properties: [makeProperty({ name: "value" })],
      events: [makeEvent({ name: "change", description: "Value changed." })]
    });

    expect(getComponentLocalJSXType(component, "solidJs")).toMatchSnapshot();
  });
});

// The IntrinsicElements interface is the only place class-level JSDoc reaches
// `components.ts`, via `getFullJSDocWithFiresTags(..., true)`.
describe("[component-declaration-file] getIntrinsicElementsInterface (class JSDoc)", () => {
  it("aligns a multi-line class JSDoc without events", () => {
    const components = [
      makeComponent({
        tagName: "kst-card",
        className: "KstCard",
        fullClassJSDoc: "/**\n * A card surface.\n *\n * @part container - The wrapper.\n */"
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });

  it("handles an empty class JSDoc string without events", () => {
    const components = [
      makeComponent({
        tagName: "kst-card",
        className: "KstCard",
        fullClassJSDoc: ""
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });

  it("handles a single-line empty JSDoc (`/***/`) without events", () => {
    const components = [
      makeComponent({
        tagName: "kst-card",
        className: "KstCard",
        fullClassJSDoc: "/***/"
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });

  it("appends backticked `@fires` tags to a multi-line JSDoc with events", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        events: [
          makeEvent({ name: "change", description: "Fires on value change." }),
          makeEvent({ name: "focus", description: "Fires on focus." })
        ]
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });

  it("appends `@fires` tags to a single-line empty JSDoc with events", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/***/",
        events: [makeEvent({ name: "change", description: "Value changed." })]
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });

  it("appends multi-line `@fires` descriptions with events", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        events: [
          makeEvent({
            name: "change",
            description: "First line.\nSecond line."
          })
        ]
      })
    ];

    expect(getIntrinsicElementsInterface(components)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getLocalJSXTypes (React/JSX namespace)", () => {
  it("renders the LocalJSX namespace and exports it as JSX", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        properties: [makeProperty({ name: "value" })],
        events: [makeEvent({ name: "change", description: "Value changed." })]
      }),
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        fullClassJSDoc: "/**\n * An icon.\n */",
        properties: [makeProperty({ name: "name" })]
      })
    ];

    expect(getLocalJSXTypes(components)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getSolidJsTypes (SolidJS namespace)", () => {
  it("renders the SolidJsJSX namespace and exports it", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        properties: [makeProperty({ name: "value" })],
        events: [makeEvent({ name: "change", description: "Value changed." })]
      }),
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        fullClassJSDoc: "/**\n * An icon.\n */",
        properties: [makeProperty({ name: "name" })]
      })
    ];

    expect(getSolidJsTypes(components)).toMatchSnapshot();
  });
});
