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
  getFrameworkEvents,
  getReactOverriddenEventHandlerNames
} from "./get-component-events-union-type.js";
import {
  getComponentPropertiesReact,
  getComponentPropertiesSolidJS
} from "./get-component-properties-union-type.js";

/**
 * Collects the de-duplicated, sorted type names imported by the components'
 * properties (`propertyImportTypes`). The React and SolidJS JSX files reference
 * these types in their `ComponentPropertiesReact` / `ComponentPropertiesSolidJS`
 * namespaces (both re-declare each prop with its real type), so they import the
 * type names from the core file (which re-exports them).
 */
const getImportedPropertyTypeNames = (components: LibraryComponents): string[] => {
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
   * StencilJS reuses `ComponentProperties` (a `Pick<>` of the class), whose
   * members inherit the class fields' optionality. In JSX every prop must be
   * optional, so it is wrapped in `Partial<>`. React and SolidJS use their own
   * `ComponentPropertiesReact` / `ComponentPropertiesSolidJS` namespaces, which
   * re-declare each prop and already encode its optionality (honoring the
   * `required` flag), so they are used as-is.
   */
  wrapProperties: (propertiesRef: string) => string;

  /**
   * Event handler prop names that must additionally be omitted from the base
   * attributes for a given component, on top of the component's properties.
   *
   * Used by React: it re-types native events the component re-declares (e.g.
   * `onInput`) with the component's own event interface, so React's synthetic
   * handler of the same name must be removed from `HTMLAttributes` to avoid an
   * incompatible intersection. SolidJS/StencilJS do not collide (their handler
   * prop names — `on:input`, or the skipped native ones — are not in the base
   * attributes), so they leave this undefined.
   */
  omittedBaseAttributeEventKeys?: (component: ComponentDefinition) => string[];

  /**
   * The framework's own attributes type for the host element. Intersecting with
   * it is what brings `className`/`class`, `style`, `ref`, `key`, `aria-*`,
   * `role`, `id`, native event handlers, etc. into the JSX prop types.
   */
  baseAttributes: (hostType: string) => string;

  /** `import type` statements required at the top of the file. */
  imports: (coreModuleSpecifier: string, components: LibraryComponents) => string;

  /**
   * Extra declarations emitted before the JSX namespace. Used by React and
   * SolidJS to declare their `ComponentPropertiesReact` /
   * `ComponentPropertiesSolidJS` namespaces locally (they are not part of the
   * core file because they re-declare each prop and so do not depend on the
   * core's class imports).
   */
  extraDeclarations?: (components: LibraryComponents) => string;

  /** Module augmentation that wires the namespace into the framework's JSX. */
  moduleAugmentation: (namespaceName: string) => string;
};

const FRAMEWORK_CONFIG = {
  react: {
    namespaceName: FRAMEWORK_JSX_NAMESPACE_NAMES.react,
    propertiesNamespace: COMPONENT_PROPERTIES_NAMESPACE_NAMES.react,
    // `ComponentPropertiesReact` already declares each prop's optionality.
    wrapProperties: propertiesRef => propertiesRef,
    baseAttributes: hostType =>
      `ReactDetailedHTMLProps<ReactHTMLAttributes<${hostType}>, ${hostType}>`,
    // The `ComponentPropertiesReact` namespace is declared locally (see
    // `extraDeclarations`) and references the components' property types, which
    // are imported from the core file (it re-exports them).
    imports: (coreModuleSpecifier, components) => {
      const propertyTypeNames = getImportedPropertyTypeNames(components);
      const propertyTypesImport =
        propertyTypeNames.length === 0
          ? ""
          : `\nimport type { ${propertyTypeNames.join(", ")} } from "${coreModuleSpecifier}";`;

      return `import type {
  DetailedHTMLProps as ReactDetailedHTMLProps,
  HTMLAttributes as ReactHTMLAttributes
} from "react";${propertyTypesImport}`;
    },
    extraDeclarations: getComponentPropertiesReact,
    omittedBaseAttributeEventKeys: getReactOverriddenEventHandlerNames,
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
      const propertyTypeNames = getImportedPropertyTypeNames(components);
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
  const {
    baseAttributes,
    propertiesNamespace,
    wrapProperties,
    omittedBaseAttributeEventKeys
  }: FrameworkConfig = FRAMEWORK_CONFIG[framework];
  const propertiesRef = `${propertiesNamespace}.${component.className}`;
  const hostType = getComponentHTMLInterfaceName(component.className);

  // Keys removed from the framework's base attributes: always the component's
  // own properties, plus (for React) the native event handlers it re-types, so
  // the component's typed/documented handler wins over the framework's synthetic
  // one instead of clashing in the intersection.
  const omittedKeys = [
    `keyof ${propertiesRef}`,
    ...(omittedBaseAttributeEventKeys?.(component) ?? []).map(key => `"${key}"`)
  ].join(" | ");

  // The events union type already ends with `;`, which terminates the type
  // alias. When there are no framework events, terminate it ourselves.
  const eventsPart =
    getFrameworkEvents(component, framework).length === 0
      ? ";"
      : ` & ${getComponentEventsUnionType(component, framework)}`;

  return `export type ${component.className} = Omit<${baseAttributes(hostType)}, ${omittedKeys}> & ${wrapProperties(propertiesRef)}${eventsPart}`;
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
