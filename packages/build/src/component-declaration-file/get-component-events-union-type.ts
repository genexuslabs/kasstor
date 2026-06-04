import { getFormattedPropertyOrEventDescription } from "../get-formatted-property-or-event-description.js";
import { getComponentEventTypeInterfaceName } from "../global-type-declarations/get-global-type-declaration.js";
import { capitalize } from "../internal/capitalize.js";
import type {
  ComponentDefinition,
  ComponentDefinitionEvents,
  LibraryComponents
} from "../typings/library-components";
import { NATIVE_DOM_EVENTS } from "./constants.js";

/**
 * Frameworks whose JSX templates need per-framework event handler prop names.
 * `"nothing"` keeps the raw event name and is used by the framework-agnostic
 * `ComponentEvents` namespace.
 */
export type EventFrameworkType = "react" | "solid" | "stencil" | "nothing";

/**
 * Builds the JSX prop name for an event handler in each framework. These rules
 * were verified against each framework's runtime so the listener is attached to
 * the right event name (see `NATIVE_DOM_EVENTS` for the native-event handling):
 *   - React strips `on` verbatim (`addEventListener(name.slice(2))`), so the
 *     prop is `on` + the verbatim event name.
 *   - StencilJS lowercases only the first character after `on`, so the prop is
 *     `on` + the capitalized event name (Stencil lowercases it back at runtime).
 *   - SolidJS uses the namespaced `on:` directive (verbatim event name).
 *   - `nothing` keeps the raw event name (framework-agnostic namespace).
 */
export const eventTemplateName = {
  react: name => `on${name}` as const,
  solid: name => `"on:${name}"` as const,
  stencil: name => `on${capitalize(name)}` as const,
  nothing: name => name
} as const satisfies {
  [key in EventFrameworkType]: <T extends string>(name: T) => string;
};

/**
 * `true` if the event must be generated as an explicit handler prop for the
 * given framework. React and StencilJS rely on their `HTMLAttributes` for native
 * DOM events, so only NON-native (custom) events are generated for them. SolidJS
 * (and the agnostic `nothing` namespace) generate every event.
 */
export const isEventGeneratedForFramework = (
  eventName: string,
  framework: EventFrameworkType
): boolean =>
  framework === "react" || framework === "stencil" ? !NATIVE_DOM_EVENTS.has(eventName) : true;

/**
 * The subset of a component's events that must be generated as explicit handler
 * props for the given framework.
 */
export const getFrameworkEvents = (
  component: ComponentDefinition,
  framework: EventFrameworkType
): ComponentDefinitionEvents =>
  (component.events ?? []).filter(({ name }) => isEventGeneratedForFramework(name, framework));

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
