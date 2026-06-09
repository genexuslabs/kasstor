import { getFormattedPropertyOrEventDescription } from "../get-formatted-property-or-event-description.js";
import { getComponentEventTypeInterfaceName } from "../global-type-declarations/get-global-type-declaration.js";
import { capitalize } from "../internal/capitalize.js";
import type {
  ComponentDefinition,
  ComponentDefinitionEvents,
  LibraryComponents
} from "../typings/library-components";
import { NATIVE_DOM_EVENTS, REACT_NATIVE_EVENT_HANDLERS } from "./constants.js";

/**
 * Frameworks whose JSX templates need per-framework event handler prop names.
 * `"nothing"` keeps the raw event name and is used by the framework-agnostic
 * `ComponentEvents` namespace.
 */
export type EventFrameworkType = "react" | "solid" | "stencil" | "nothing";

/**
 * Builds the JSX prop name for an event handler in each framework. These rules
 * were verified against each framework's runtime so the listener is attached to
 * the right event name:
 *   - React uses its own handler prop name for native events (e.g. `input` ->
 *     `onInput`, looked up in `REACT_NATIVE_EVENT_HANDLERS`); for non-native
 *     (custom) events it strips `on` verbatim (`addEventListener(name.slice(2))`),
 *     so the prop is `on` + the verbatim event name.
 *   - StencilJS lowercases only the first character after `on`, so the prop is
 *     `on` + the capitalized event name (Stencil lowercases it back at runtime).
 *   - SolidJS uses the namespaced `on:` directive (verbatim event name).
 *   - `nothing` keeps the raw event name (framework-agnostic namespace).
 */
export const eventTemplateName = {
  react: name => REACT_NATIVE_EVENT_HANDLERS.get(name) ?? (`on${name}` as const),
  solid: name => `"on:${name}"` as const,
  stencil: name => `on${capitalize(name)}` as const,
  nothing: name => name
} as const satisfies {
  [key in EventFrameworkType]: <T extends string>(name: T) => string;
};

/**
 * `true` if the event must be generated as an explicit handler prop for the
 * given framework. StencilJS relies on its `HTMLAttributes` for native DOM
 * events, so only NON-native (custom) events are generated for it. React,
 * SolidJS and the agnostic `nothing` namespace generate every event: React
 * re-types native events with the component's own event interface (overriding
 * React's synthetic handler — see `eventTemplateName`/`getFrameworkEvents`).
 */
export const isEventGeneratedForFramework = (
  eventName: string,
  framework: EventFrameworkType
): boolean => (framework === "stencil" ? !NATIVE_DOM_EVENTS.has(eventName) : true);

/**
 * The subset of a component's events that must be generated as explicit handler
 * props for the given framework.
 */
export const getFrameworkEvents = (
  component: ComponentDefinition,
  framework: EventFrameworkType
): ComponentDefinitionEvents =>
  (component.events ?? []).filter(({ name }) => isEventGeneratedForFramework(name, framework));

/**
 * The React handler prop names of the events a component re-declares that React
 * also exposes natively (e.g. a re-typed `input` event yields `["onInput"]`).
 *
 * These must be omitted from React's base `HTMLAttributes` in the prop-type
 * intersection, so the component's own (correctly-typed, documented) handler
 * wins instead of clashing with React's synthetic one. Custom events (and
 * native events React does not expose) are not in the map, so they are absent
 * here and need no omission.
 */
export const getReactOverriddenEventHandlerNames = (component: ComponentDefinition): string[] =>
  (component.events ?? [])
    .map(({ name }) => REACT_NATIVE_EVENT_HANDLERS.get(name))
    .filter((handlerName): handlerName is string => handlerName !== undefined);

export const getComponentEventsUnionType = (
  component: ComponentDefinition,
  framework: EventFrameworkType
) =>
  `{
  ${getFrameworkEvents(component, framework)
    .map(
      ({ name, description }) => `  ${getFormattedPropertyOrEventDescription(description)}
    ${eventTemplateName[framework](name)}?: (event: ${getComponentEventTypeInterfaceName(component.className, name)}) => void;`
    )
    .join("\n\n  ")}
  };`;

export const getComponentEvents = (components: LibraryComponents, framework: EventFrameworkType) =>
  `/**
 * Each interface contains the events of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentEvents {
  ${components
    .filter(({ events }) => events && events.length !== 0)
    .map(
      component =>
        `export type ${component.className} = ${getComponentEventsUnionType(component, framework)}`
    )
    .join("\n\n  ")}
}`;
