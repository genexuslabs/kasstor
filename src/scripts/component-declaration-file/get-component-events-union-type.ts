import {
  ComponentDefinition,
  LibraryComponents
} from "../library-summary/types";

export const getComponentEventsUnionType = (component: ComponentDefinition) =>
  `{
  ${component
    .events!.map(
      ({ name, detailType, description }) => `
  /**
   * ${description}
   **/
  "${name}": CustomEvent<${detailType}>;`
    )
    .join("\n  ")}
}`;

export const getComponentEvents = (components: LibraryComponents) =>
  `/**
 * Each interface contains the events of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentEvents {
  ${components
    .filter(({ events }) => events && events.length !== 0)
    .map(
      component =>
        `export type ${component.className} = ${getComponentEventsUnionType(component)}`
    )
    .join("\n\n")}
}`;
