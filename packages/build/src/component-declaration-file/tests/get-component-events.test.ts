import { describe, expect, it } from "vitest";

import {
  eventTemplateName,
  getComponentEvents,
  getComponentEventsUnionType
} from "../get-component-events-union-type.js";
import { makeComponent, makeEvent } from "./fixtures.js";

// The event-prop name is the single biggest difference between the React/JSX,
// SolidJS and "raw" (`nothing`) representations.
describe("[component-declaration-file] eventTemplateName", () => {
  it("prefixes and capitalizes for JSX (React)", () => {
    expect(eventTemplateName.jsx("change")).toBe("onChange");
  });

  it("keeps the raw name for `nothing`", () => {
    expect(eventTemplateName.nothing("change")).toBe("change");
  });

  it('wraps as `"on:name"` for SolidJS', () => {
    expect(eventTemplateName.solidJs("change")).toBe('"on:change"');
  });
});

describe("[component-declaration-file] getComponentEventsUnionType", () => {
  // `getComponentEvents` calls this with `"nothing"` when building
  // `components.ts`; the other framework variants feed the JSX namespaces.
  it("renders a single event for the `nothing` framework", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "change", description: "Value changed." })]
    });

    expect(getComponentEventsUnionType(component, "nothing")).toMatchSnapshot();
  });

  it("renders the same event for JSX (React)", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "change", description: "Value changed." })]
    });

    expect(getComponentEventsUnionType(component, "jsx")).toMatchSnapshot();
  });

  it("renders the same event for SolidJS", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "change", description: "Value changed." })]
    });

    expect(getComponentEventsUnionType(component, "solidJs")).toMatchSnapshot();
  });

  it("renders multiple events", () => {
    const component = makeComponent({
      className: "KstField",
      events: [
        makeEvent({ name: "change", description: "Value changed." }),
        makeEvent({ name: "input", description: "Value is being typed." })
      ]
    });

    expect(getComponentEventsUnionType(component, "nothing")).toMatchSnapshot();
  });

  it("renders an event without a description as an empty JSDoc", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "change", description: undefined })]
    });

    expect(getComponentEventsUnionType(component, "nothing")).toMatchSnapshot();
  });

  it("renders multi-line event descriptions", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "change", description: "First line.\nSecond line." })]
    });

    expect(getComponentEventsUnionType(component, "nothing")).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getComponentEvents namespace", () => {
  it("only includes components that declare events", () => {
    const components = [
      makeComponent({
        className: "KstField",
        events: [makeEvent({ name: "change", description: "Value changed." })]
      }),
      // No events: must be excluded from the namespace.
      makeComponent({ className: "KstIcon" }),
      // Empty events array: must also be excluded.
      makeComponent({ className: "KstBadge", events: [] })
    ];

    expect(getComponentEvents(components, "nothing")).toMatchSnapshot();
  });
});
