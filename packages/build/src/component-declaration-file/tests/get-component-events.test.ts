import { describe, expect, it } from "vitest";

import {
  eventTemplateName,
  getComponentEvents,
  getComponentEventsUnionType,
  getFrameworkEvents,
  isEventGeneratedForFramework
} from "../get-component-events-union-type.js";
import { makeComponent, makeEvent } from "./fixtures.js";

// The event-prop name is the single biggest difference between the React,
// StencilJS, SolidJS and "raw" (`nothing`) representations. These rules were
// verified against each framework's runtime.
describe("[component-declaration-file] eventTemplateName", () => {
  it("keeps the verbatim event name with an `on` prefix for React", () => {
    expect(eventTemplateName.react("selectedItemsChange")).toBe("onselectedItemsChange");
  });

  it("capitalizes the event name with an `on` prefix for StencilJS", () => {
    expect(eventTemplateName.stencil("selectedItemsChange")).toBe("onSelectedItemsChange");
  });

  it('wraps as `"on:name"` (verbatim) for SolidJS', () => {
    expect(eventTemplateName.solid("selectedItemsChange")).toBe('"on:selectedItemsChange"');
  });

  it("keeps the raw name for `nothing`", () => {
    expect(eventTemplateName.nothing("selectedItemsChange")).toBe("selectedItemsChange");
  });
});

describe("[component-declaration-file] isEventGeneratedForFramework", () => {
  it("skips native DOM events for React and StencilJS", () => {
    expect(isEventGeneratedForFramework("input", "react")).toBe(false);
    expect(isEventGeneratedForFramework("input", "stencil")).toBe(false);
  });

  it("generates custom (non-native) events for React and StencilJS", () => {
    expect(isEventGeneratedForFramework("selectedItemsChange", "react")).toBe(true);
    expect(isEventGeneratedForFramework("selectedItemsChange", "stencil")).toBe(true);
  });

  it("generates every event for SolidJS and the agnostic namespace", () => {
    expect(isEventGeneratedForFramework("input", "solid")).toBe(true);
    expect(isEventGeneratedForFramework("input", "nothing")).toBe(true);
  });
});

describe("[component-declaration-file] getFrameworkEvents", () => {
  const component = makeComponent({
    events: [
      makeEvent({ name: "input" }), // native
      makeEvent({ name: "selectedItemsChange" }) // custom
    ]
  });

  it("filters out native events for React and StencilJS", () => {
    expect(getFrameworkEvents(component, "react").map(e => e.name)).toEqual([
      "selectedItemsChange"
    ]);
    expect(getFrameworkEvents(component, "stencil").map(e => e.name)).toEqual([
      "selectedItemsChange"
    ]);
  });

  it("keeps every event for SolidJS and the agnostic namespace", () => {
    expect(getFrameworkEvents(component, "solid").map(e => e.name)).toEqual([
      "input",
      "selectedItemsChange"
    ]);
    expect(getFrameworkEvents(component, "nothing").map(e => e.name)).toEqual([
      "input",
      "selectedItemsChange"
    ]);
  });

  it("returns an empty array for a component without events", () => {
    expect(getFrameworkEvents(makeComponent(), "react")).toEqual([]);
  });
});

describe("[component-declaration-file] getComponentEventsUnionType", () => {
  const mixedEvents = makeComponent({
    className: "KstField",
    events: [
      makeEvent({ name: "input", description: "Native input." }),
      makeEvent({
        name: "selectedItemsChange",
        description: "Selection changed."
      })
    ]
  });

  it("renders only the custom event for React (native delegated to HTMLAttributes)", () => {
    expect(getComponentEventsUnionType(mixedEvents, "react")).toMatchSnapshot();
  });

  it("renders only the custom event for StencilJS (capitalized prop name)", () => {
    expect(getComponentEventsUnionType(mixedEvents, "stencil")).toMatchSnapshot();
  });

  it('renders every event for SolidJS with the "on:" prefix', () => {
    expect(getComponentEventsUnionType(mixedEvents, "solid")).toMatchSnapshot();
  });

  it("renders every event with the raw name for the agnostic namespace", () => {
    expect(getComponentEventsUnionType(mixedEvents, "nothing")).toMatchSnapshot();
  });

  it("renders an event without a description as an empty JSDoc", () => {
    const component = makeComponent({
      className: "KstField",
      events: [makeEvent({ name: "selectedItemsChange", description: undefined })]
    });

    expect(getComponentEventsUnionType(component, "react")).toMatchSnapshot();
  });

  it("renders multi-line event descriptions", () => {
    const component = makeComponent({
      className: "KstField",
      events: [
        makeEvent({
          name: "selectedItemsChange",
          description: "First line.\nSecond line."
        })
      ]
    });

    expect(getComponentEventsUnionType(component, "react")).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getComponentEvents namespace", () => {
  it("only includes components that declare events (raw event names)", () => {
    const components = [
      makeComponent({
        className: "KstField",
        events: [makeEvent({ name: "selectedItemsChange", description: "Changed." })]
      }),
      // No events: must be excluded from the namespace.
      makeComponent({ className: "KstIcon" }),
      // Empty events array: must also be excluded.
      makeComponent({ className: "KstBadge", events: [] })
    ];

    expect(getComponentEvents(components, "nothing")).toMatchSnapshot();
  });
});
