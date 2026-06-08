import {
  getAlignedClassJSDoc,
  getComponentHTMLInterfaceName
} from "../global-type-declarations/get-global-type-declaration.js";
import type { ComponentDefinition, LibraryComponents } from "../typings/library-components";
import {
  COMPONENT_PROPERTIES_NAMESPACE_NAMES,
  FRAMEWORK_JSX_NAMESPACE_NAMES
} from "./constants.js";
import {
  getComponentEventsUnionType,
  getFrameworkEvents
} from "./get-component-events-union-type.js";
import { getComponentPropertiesSolidJS } from "./get-component-properties-union-type.js";

/**
 * Collects the de-duplicated, sorted type names imported by the components'
 * properties (`propertyImportTypes`). The SolidJS JSX file references these
 * types in its `ComponentPropertiesSolidJS` namespace, so it imports them from
 * the core file (which re-exports them).
 */
const getSolidPropertyTypeNames = (components: LibraryComponents): string[] => {
  const typeNames = new Set<string>();

  components.forEach(({ propertyImportTypes }) => {
    if (propertyImportTypes) {
      Object.values(propertyImportTypes).forEach(names =>
        names.forEach(name => typeNames.add(name))
      );
    }
  });

  return [...typeNames].sort();
};

/**
 * Frameworks for which a dedicated, opt-in JSX types file is generated.
 */
export type JsxFramework = "react" | "solid" | "stencil";

/**
 * Per-framework knobs used to build the JSX types file. Everything that differs
 * between React, SolidJS and StencilJS is captured here so the file body can be
 * built by a single shared routine (see `getFrameworkDeclaration`).
 */
type FrameworkConfig = {
  /** Name of the file-scoped namespace that holds the JSX prop types. */
  namespaceName: string;

  /** Properties namespace (from the core file) reused for each component. */
  propertiesNamespace: string;

  /**
   * Wraps the component properties reference for this framework.
   *
   * React and StencilJS reuse `ComponentProperties` (a `Pick<>` of the class),
   * whose members inherit the class fields' optionality. In JSX every prop must
   * be optional, so they are wrapped in `Partial<>`. SolidJS uses
   * `ComponentPropertiesSolidJS`, which already declares each prop's optionality
   * (honoring the `required` flag), so it is used as-is.
   */
  wrapProperties: (propertiesRef: string) => string;

  /**
   * The framework's own attributes type for the host element. Intersecting with
   * it is what brings `className`/`class`, `style`, `ref`, `key`, `aria-*`,
   * `role`, `id`, native event handlers, etc. into the JSX prop types.
   */
  baseAttributes: (hostType: string) => string;

  /** `import type` statements required at the top of the file. */
  imports: (coreModuleSpecifier: string, components: LibraryComponents) => string;

  /**
   * Extra declarations emitted before the JSX namespace. Used by SolidJS to
   * declare its `ComponentPropertiesSolidJS` namespace locally (it is not part
   * of the core file because it does not depend on the core's class imports).
   */
  extraDeclarations?: (components: LibraryComponents) => string;

  /** Module augmentation that wires the namespace into the framework's JSX. */
  moduleAugmentation: (namespaceName: string) => string;
};

const FRAMEWORK_CONFIG = {
  react: {
    namespaceName: FRAMEWORK_JSX_NAMESPACE_NAMES.react,
    propertiesNamespace: COMPONENT_PROPERTIES_NAMESPACE_NAMES.jsx,
    wrapProperties: propertiesRef => `Partial<${propertiesRef}>`,
    baseAttributes: hostType =>
      `ReactDetailedHTMLProps<ReactHTMLAttributes<${hostType}>, ${hostType}>`,
    imports: coreModuleSpecifier => `import type {
  DetailedHTMLProps as ReactDetailedHTMLProps,
  HTMLAttributes as ReactHTMLAttributes
} from "react";
import type { ${COMPONENT_PROPERTIES_NAMESPACE_NAMES.jsx} } from "${coreModuleSpecifier}";`,
    moduleAugmentation: namespaceName => `declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${namespaceName}.IntrinsicElements {}
  }
}`
  },
  solid: {
    namespaceName: FRAMEWORK_JSX_NAMESPACE_NAMES.solid,
    propertiesNamespace: COMPONENT_PROPERTIES_NAMESPACE_NAMES.solidJs,
    // `ComponentPropertiesSolidJS` already declares each prop's optionality.
    wrapProperties: propertiesRef => propertiesRef,
    baseAttributes: hostType => `JSX.HTMLAttributes<${hostType}>`,
    // The `ComponentPropertiesSolidJS` namespace is declared locally (see
    // `extraDeclarations`) and references the components' property types, which
    // are imported from the core file (it re-exports them).
    imports: (coreModuleSpecifier, components) => {
      const propertyTypeNames = getSolidPropertyTypeNames(components);
      const propertyTypesImport =
        propertyTypeNames.length === 0
          ? ""
          : `\nimport type { ${propertyTypeNames.join(", ")} } from "${coreModuleSpecifier}";`;

      return `import type { JSX } from "solid-js";${propertyTypesImport}`;
    },
    extraDeclarations: getComponentPropertiesSolidJS,
    moduleAugmentation: namespaceName => `declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${namespaceName}.IntrinsicElements {}
  }
}`
  },
  stencil: {
    namespaceName: FRAMEWORK_JSX_NAMESPACE_NAMES.stencil,
    propertiesNamespace: COMPONENT_PROPERTIES_NAMESPACE_NAMES.jsx,
    wrapProperties: propertiesRef => `Partial<${propertiesRef}>`,
    baseAttributes: hostType => `JSXBase.HTMLAttributes<${hostType}>`,
    imports: coreModuleSpecifier => `import type { JSXBase } from "@stencil/core/internal";
// Empty import so the bare "@stencil/core" module is known to the augmentation
// below (augmenting a module requires it to be resolvable in the program).
import type {} from "@stencil/core";
import type { ${COMPONENT_PROPERTIES_NAMESPACE_NAMES.jsx} } from "${coreModuleSpecifier}";`,
    moduleAugmentation: namespaceName => `declare module "@stencil/core" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${namespaceName}.IntrinsicElements {}
  }
}`
  }
} as const satisfies Record<JsxFramework, FrameworkConfig>;

const FRAMEWORK_BANNER_TITLE = {
  react: "Types for React JSX templates",
  solid: "Types for SolidJS JSX templates",
  stencil: "Types for StencilJS JSX templates"
} as const satisfies Record<JsxFramework, string>;

/** Human-readable framework names used in generated comments. */
const FRAMEWORK_DISPLAY_NAME = {
  react: "React",
  solid: "SolidJS",
  stencil: "StencilJS"
} as const satisfies Record<JsxFramework, string>;

/**
 * Builds the import module specifier that the framework file uses to reference
 * the properties namespaces re-used from the core file (e.g. `components.ts`).
 *
 * Both files are generated in the same directory, so the specifier is relative
 * and uses the `.js` extension to be ESM-compatible.
 */
export const getCoreModuleSpecifier = (coreFileName: string): string =>
  `./${coreFileName.replace(/\.(ts|js)$/, "")}.js`;

const banner = (
  framework: JsxFramework
) => `// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// ${FRAMEWORK_BANNER_TITLE[framework]}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -`;

/**
 * JSX prop type for a single component, intersecting the framework's base
 * attributes (minus the component's own properties, to avoid collisions) with
 * the component properties and the custom-event handlers.
 */
export const getComponentFrameworkType = (
  component: ComponentDefinition,
  framework: JsxFramework
) => {
  const { baseAttributes, propertiesNamespace, wrapProperties } = FRAMEWORK_CONFIG[framework];
  const propertiesRef = `${propertiesNamespace}.${component.className}`;
  const hostType = getComponentHTMLInterfaceName(component.className);

  // The events union type already ends with `;`, which terminates the type
  // alias. When there are no framework events, terminate it ourselves.
  const eventsPart =
    getFrameworkEvents(component, framework).length === 0
      ? ";"
      : ` & ${getComponentEventsUnionType(component, framework)}`;

  return `export type ${component.className} = Omit<${baseAttributes(hostType)}, keyof ${propertiesRef}> & ${wrapProperties(propertiesRef)}${eventsPart}`;
};

export const getIntrinsicElementsInterface = (components: LibraryComponents) => `
  interface IntrinsicElements {${components
    .map(
      ({
        className,
        fullClassJSDoc,
        tagName
      }) => `${getAlignedClassJSDoc(fullClassJSDoc).split("\n").join("\n  ")}
    "${tagName}": ${className};`
    )
    .join("\n    ")}
  }`;

const noPublicComponentsComment = (framework: JsxFramework) => `//
// No "public" components were found. The ${FRAMEWORK_DISPLAY_NAME[framework]} JSX types are only generated for "public" components.
//`;

/**
 * Builds the full content of a per-framework JSX types file. The file is
 * self-contained: it imports the framework's attribute types and the core
 * properties namespace, declares the per-component JSX prop types, and augments
 * the framework's `IntrinsicElements`.
 *
 * @param coreFileName - File name of the core (framework-agnostic) types file
 *   (e.g. `components.ts`) that this file re-uses the properties namespace from.
 */
export const getFrameworkDeclaration = (
  components: LibraryComponents,
  framework: JsxFramework,
  coreFileName: string
) => {
  if (components.length === 0) {
    return noPublicComponentsComment(framework);
  }

  const { imports, extraDeclarations, moduleAugmentation, namespaceName }: FrameworkConfig =
    FRAMEWORK_CONFIG[framework];

  const extra = extraDeclarations ? `${extraDeclarations(components)}\n\n` : "";

  return `${imports(getCoreModuleSpecifier(coreFileName), components)}

${banner(framework)}
${extra}// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace ${namespaceName} {
  ${components.map(component => getComponentFrameworkType(component, framework)).join("\n\n  ")}
  ${getIntrinsicElementsInterface(components)}
}

export type { ${namespaceName} };

${moduleAugmentation(namespaceName)}`;
};

export const getReactDeclaration = (components: LibraryComponents, coreFileName: string) =>
  getFrameworkDeclaration(components, "react", coreFileName);

export const getSolidDeclaration = (components: LibraryComponents, coreFileName: string) =>
  getFrameworkDeclaration(components, "solid", coreFileName);

export const getStencilDeclaration = (components: LibraryComponents, coreFileName: string) =>
  getFrameworkDeclaration(components, "stencil", coreFileName);
