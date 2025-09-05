import { getImportClassName } from "./get-import-class-name";
import { ComponentDefinition, LibraryComponents } from "./types";

export const getComponentPropertiesUnionType = (
  component: ComponentDefinition
) =>
  !component.properties || component.properties.length === 0
    ? "{}"
    : `Pick<${getImportClassName(component.className)}, ${component.properties.map(({ name }) => `"${name}"`).join(" | ")}>;`;

export const getComponentProperties = (components: LibraryComponents) =>
  `/**
     * Each interface contains the properties of the custom elements of the library.
     */
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Components {
      ${components.map(component => `export type ${component.className} = ${getComponentPropertiesUnionType(component)}`).join("\n  ")}
    }`;
