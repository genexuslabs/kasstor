import { getFullJSDocWithFiresTags } from "../global-type-declarations/get-global-type-declaration";
import type {
  ComponentDefinition,
  LibraryComponents
} from "../library-summary/types";
import { COMPONENT_PROPERTIES_NAMESPACE_NAMES } from "./constants";
import { getComponentEventsUnionType } from "./get-component-events-union-type";

const LOCAL_JSX_NAMESPACE = "LocalJSX";
const SOLID_JS_NAMESPACE = "SolidJsJSX";

export const getComponentLocalJSXType = (
  component: ComponentDefinition,
  frameworkType: "solidJs" | "jsx" | "nothing"
) =>
  component.events && component.events.length !== 0
    ? `export type ${component.className} = ${COMPONENT_PROPERTIES_NAMESPACE_NAMES[frameworkType]}.${component.className} & ${getComponentEventsUnionType(component, frameworkType)}`
    : `export type ${component.className} = ${COMPONENT_PROPERTIES_NAMESPACE_NAMES[frameworkType]}.${component.className};`;

export const getIntrinsicElementsInterface = (
  components: LibraryComponents
) => `
  interface IntrinsicElements {${components
    .map(
      ({
        className,
        events,
        fullClassJSDoc,
        tagName
      }) => `${getFullJSDocWithFiresTags(fullClassJSDoc, events, true).split("\n").join("\n  ")}
    "${tagName}": ${className};`
    )
    .join("\n    ")}
  }`;

export const getLocalJSXTypes = (components: LibraryComponents) => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                  Types for JSX templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare namespace ${LOCAL_JSX_NAMESPACE} {
  ${components.map(component => getComponentLocalJSXType(component, "jsx")).join("\n\n  ")}
  ${getIntrinsicElementsInterface(components)}
}
  
export type { ${LOCAL_JSX_NAMESPACE} as JSX };`;

export const getSolidJsTypes = (components: LibraryComponents) => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                Types for SolidJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare namespace ${SOLID_JS_NAMESPACE} {
  ${components.map(component => getComponentLocalJSXType(component, "solidJs")).join("\n\n  ")}
  ${getIntrinsicElementsInterface(components)}
}

export type { ${SOLID_JS_NAMESPACE} };`;

export const getReactModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//          Apply module types for React templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "react" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${LOCAL_JSX_NAMESPACE}.IntrinsicElements {}
  }
}`;

export const getSolidJsModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//         Apply module types for SolidJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "solid-js" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${SOLID_JS_NAMESPACE}.IntrinsicElements {}
  }
}`;

export const getStencilJsModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//        Apply module types for StencilJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "@stencil/core" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ${LOCAL_JSX_NAMESPACE}.IntrinsicElements {}
  }
}`;

