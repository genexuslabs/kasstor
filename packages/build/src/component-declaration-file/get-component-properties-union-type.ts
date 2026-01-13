import { getFormattedPropertyOrEventDescription } from "../get-formatted-property-or-event-description.js";
import type {
  ComponentDefinition,
  LibraryComponents
} from "../typings/library-components";
import { COMPONENT_PROPERTIES_NAMESPACE_NAMES } from "./constants.js";
import { getImportClassName } from "./get-import-class-name.js";

export const getComponentPropertiesUnionType = (
  component: ComponentDefinition
) =>
  !component.properties || component.properties.length === 0
    ? "{}"
    : `Pick<${getImportClassName(component.className)}, ${component.properties.map(({ name }) => `"${name}"`).join(" | ")}>`;

export const getComponentPropertiesUnionTypeSolidJS = ({
  properties
}: ComponentDefinition) =>
  !properties || properties.length === 0
    ? "{}"
    : `{
    ${properties
      .map(
        property => `${getFormattedPropertyOrEventDescription(property.description)}
    "prop:${property.name}"${property.required ? "" : "?"}: ${property.type.split("\n").join("\n  ")};`
      )
      .join("\n\n    ")}
  }`;

export const getComponentBaseClass = (components: LibraryComponents) =>
  `/**
 * Each interface contains the base class of the custom elements of the
 * library.
 */
export interface ComponentBaseClasses {
  ${components.map(component => `"${component.tagName}": ${getImportClassName(component.className)};`).join("\n  ")}
}`;

export const getComponentProperties = (components: LibraryComponents) =>
  `/**
 * Each interface contains the properties of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ${COMPONENT_PROPERTIES_NAMESPACE_NAMES.jsx} {
  ${components.map(component => `export type ${component.className} = ${getComponentPropertiesUnionType(component)};`).join("\n  ")}
}`;

export const getComponentPropertiesSolidJS = (components: LibraryComponents) =>
  `/**
 * Each interface contains the properties of the custom elements of the library.
 * This format is used for SolidJS applications.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ${COMPONENT_PROPERTIES_NAMESPACE_NAMES.solidJs} {
  ${components.map(component => `export type ${component.className} = ${getComponentPropertiesUnionTypeSolidJS(component)};`).join("\n\n  ")}
}`;

