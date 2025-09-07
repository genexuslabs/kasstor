import { capitalize } from "../capitilize";
import { getComponentEventTypeInterfaceName } from "../global-type-declarations/get-global-type-declaration";
import type {
  ComponentDefinition,
  LibraryComponents
} from "../library-summary/types";

export const eventTemplateName = {
  jsx: name => `on${capitalize(name)}` as const,
  nothing: name => name,
  solidjs: name => `"on:${name}"` as const
} as const satisfies {
  [key in "solidjs" | "jsx" | "nothing"]: <T extends string>(name: T) => string;
};

export const getComponentEventsUnionType = (
  component: ComponentDefinition,
  frameworkType: "solidjs" | "jsx" | "nothing"
) =>
  `{
  ${component
    .events!.map(
      ({ name, description }) => `  /**
     * ${description?.split("\n").join("\n     * ") ?? ""}
     */
    ${eventTemplateName[frameworkType](name)}?: ${getComponentEventTypeInterfaceName(component.className, name)};`
    )
    .join("\n\n  ")}
  };`;

export const getComponentEvents = (
  components: LibraryComponents,
  frameworkType: "solidjs" | "jsx" | "nothing"
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
