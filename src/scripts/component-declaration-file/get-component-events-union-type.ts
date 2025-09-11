import { capitalize } from "../capitalize";
import { getFormattedPropertyOrEventDescription } from "../get-formatted-property-or-event-description";
import { getComponentEventTypeInterfaceName } from "../global-type-declarations/get-global-type-declaration";
import type {
  ComponentDefinition,
  LibraryComponents
} from "../library-summary/types";

export const eventTemplateName = {
  jsx: name => `on${capitalize(name)}` as const,
  nothing: name => name,
  solidJs: name => `"on:${name}"` as const
} as const satisfies {
  [key in "solidJs" | "jsx" | "nothing"]: <T extends string>(name: T) => string;
};

export const getComponentEventsUnionType = (
  component: ComponentDefinition,
  frameworkType: "solidJs" | "jsx" | "nothing"
) =>
  `{
  ${component
    .events!.map(
      ({
        name,
        description
      }) => `  ${getFormattedPropertyOrEventDescription(description)}
    ${eventTemplateName[frameworkType](name)}?: ${getComponentEventTypeInterfaceName(component.className, name)};`
    )
    .join("\n\n  ")}
  };`;

export const getComponentEvents = (
  components: LibraryComponents,
  frameworkType: "solidJs" | "jsx" | "nothing"
) =>
  `/**
 * Each interface contains the events of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentEvents {
  ${components
    .filter(({ events }) => events && events.length !== 0)
    .map(
      component =>
        `export type ${component.className} = ${getComponentEventsUnionType(component, frameworkType)}`
    )
    .join("\n\n  ")}
}`;

