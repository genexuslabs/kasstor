import { join } from "path";
import { ComponentDefinition, LibraryComponents } from "./types";

const CLASS_SUFFIX = "Element";

export const getImportClassName = <T extends string>(className: T) =>
  `${className}${CLASS_SUFFIX}` as const;

export const getComponentPropertiesUnionType = (
  component: ComponentDefinition
) =>
  !component.properties || component.properties.length === 0
    ? "{}"
    : `Pick<${getImportClassName(component.className)}, ${component.properties.map(({ name }) => `"${name}"`).join(" | ")}>;`;

export const getImportPaths = (
  relativeComponentsSrcPath: string,
  components: LibraryComponents
) =>
  components
    .map(
      component =>
        `import type { ${component.className} as ${getImportClassName(component.className)} } from "./${join(relativeComponentsSrcPath, component.srcPath)}";`
    )
    .join("\n");

export const getComponentProperties = (components: LibraryComponents) =>
  `/**
 * All component definitions of the library. Each interface contains the
 * properties of the custom elements.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Components {
  ${components.map(component => `export type ${component.className} = ${getComponentPropertiesUnionType(component)}`).join("\n  ")}
}`;

export const getComponentDeclaration = (
  relativeComponentsSrcPath: string,
  components: LibraryComponents
) => `${getImportPaths(relativeComponentsSrcPath, components)}

${getComponentProperties(components)}`;

