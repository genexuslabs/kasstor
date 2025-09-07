import type {
  ComponentDefinition,
  LibraryComponents
} from "../library-summary/types";
import { getComponentEventsUnionType } from "./get-component-events-union-type";

export const getComponentLocalJSXType = (
  component: ComponentDefinition,
  frameworkType: "solidjs" | "jsx" | "nothing"
) =>
  component.events && component.events.length !== 0
    ? `export type ${component.className} = ComponentProperties.${component.className} & ${getComponentEventsUnionType(component, frameworkType)}`
    : `export type ${component.className} = ComponentProperties.${component.className};`;

export const getLocalJSXTypes = (components: LibraryComponents) => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                  Types for JSX templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace LocalJSX {
  ${components.map(component => getComponentLocalJSXType(component, "jsx")).join("\n\n  ")}

  interface IntrinsicElements {
    ${components.map(({ className, tagName }) => `"${tagName}": ${className};`).join("\n    ")}
  }
}
  
export type { LocalJSX as JSX };`;

export const getSolidJsTypes = (components: LibraryComponents) => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                Types for SolidJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace SolidJsJSX {
  ${components.map(component => getComponentLocalJSXType(component, "solidjs")).join("\n\n  ")}

  interface IntrinsicElements {
    ${components.map(({ className, tagName }) => `"${tagName}": ${className};`).join("\n    ")}
  }
}

export type { SolidJsJSX };`;

export const getReactModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//          Apply module types for React templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type IntrinsicElements = LocalJSX.IntrinsicElements;
  }
}`;

export const getSolidJsModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//         Apply module types for SolidJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type IntrinsicElements = SolidJsJSX.IntrinsicElements;
  }
}`;

export const getStencilJsModuleTypes = () => `
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//        Apply module types for StencilJS templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare module "@stencil/core" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace JSX {
    type IntrinsicElements = LocalJSX.IntrinsicElements;
  }
}`;
