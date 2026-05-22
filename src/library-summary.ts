export const librarySummary = [] as const satisfies LibraryComponents;

export type LibraryComponents = ComponentDefinition[];
export type ComponentDefinition = {
  /**
   * The visibility of the component in the library. "public" component can be
   * used outside of the library, but "private" components are scoped to the
   * library, meaning that they should not be used outside of the library.
   *
   * For example, if a component is part of a render and should only be controlled
   * by the render, it should be marked with "private" | "protected" | "package".
   */
  access: "public" | "private" | "protected" | "package";
  tagName: string;
  className: string;
  description: string;
  /**
   * The full JSDoc comment of the custom element Class.
   */
  fullClassJSDoc: string;
  /**
   * Relative path where the component's class is located.
   */
  srcPath: string;
  /**
   * The path where the component is defined to be imported.
   *
   * This path is defined "exports" field of the package.json.
   */
  packageJsonExportsPath?: string;
  /**
   * Semantic role that the component implements. A component might implement
   * multiple accessible roles, in which case they are defined with an array.
   */
  accessibleRole?: string | string[];
  /**
   * Development status of the component.
   */
  developmentStatus:
    | "experimental"
    | "developer-preview"
    | "stable"
    | "to-be-defined";
  /**
   * `true` if the component can be used in web forms by setting the name
   * attribute on the tag.
   */
  formAssociated?: boolean;
  /**
   * Shadow root mode.
   */
  mode: "open" | "closed";
  /**
   * `true` if the web component has Shadow DOM.
   */
  shadow: boolean;
  properties?: ComponentDefinitionProperties;
  events?: ComponentDefinitionEvents;
  methods?: ComponentDefinitionMethods;
  parts?: ComponentDefinitionParts;
  slots?: ComponentDefinitionSlots;
  cssVariables?: ComponentDefinitionCssVariables;
  /**
   * The location of type declarations that the component imports in order to
   * correctly type its properties. These imports are relative to the folder
   * of where the library is analyzed.
   */
  propertyImportTypes?: ComponentImportTypes;
  /**
   * The location of type declarations that the component imports in order to
   * correctly type its events. These imports are relative to the folder
   * of where the library is analyzed.
   */
  eventImportTypes?: ComponentImportTypes;
  /**
   * The location of type declarations that the component imports in order to
   * correctly type its methods. These imports are relative to the folder
   * of where the library is analyzed.
   */
  methodImportTypes?: ComponentImportTypes;
};
export type ComponentDefinitionProperties = ComponentDefinitionProperty[];
export type ComponentDefinitionEvents = ComponentDefinitionEvent[];
export type ComponentDefinitionMethods = ComponentDefinitionMethod[];
export type ComponentDefinitionParts = ComponentDefinitionPart[];
export type ComponentDefinitionSlots = ComponentDefinitionSlot[];
export type ComponentDefinitionCssVariables = ComponentDefinitionCssVariable[];
export type ComponentImportTypes = Record<string, string[]>;
export type ComponentDefinitionProperty = {
  /**
   * If `false`, the property is not associated with an HTML attribute.
   * Otherwise, it is a string with the name of the attribute that is synced
   * with the class property.
   */
  attribute: string | false;
  default: string;
  description?: string;
  name: string;
  /**
   * `true` if the property value is reflected with the attribute in the DOM.
   */
  reflect?: boolean;
  /**
   * `true` if the property is required for using the component.
   */
  required?: boolean;
  type: string;
};
export type ComponentDefinitionEvent = {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  description?: string;
  /**
   * Type for the `detail` field of the event. If the event doesn't emits any
   * detail, the `detailType` is be `void`.
   */
  detailType: string;
  name: string;
};
export type ComponentDefinitionMethod = {
  description?: string;
  name: string;
  paramTypes: {
    name: string;
    description?: string;
    type: string;
  }[];
  returnType: string;
};
export type ComponentDefinitionPart = {
  description?: string;
  name: string;
};
export type ComponentDefinitionSlot = {
  description?: string;
  name: string;
};
export type ComponentDefinitionCssVariable = {
  description?: string;
  default?: string;
  name: string;
};
