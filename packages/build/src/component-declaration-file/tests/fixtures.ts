import type {
  ComponentDefinition,
  ComponentDefinitionEvent,
  ComponentDefinitionMethod,
  ComponentDefinitionProperty
} from "../../typings/library-components";

/**
 * Builds a fresh `ComponentDefinition` on every call.
 *
 * Returning a brand new object (and a brand new array when callers build
 * libraries with `[makeComponent(), makeComponent()]`) is intentional and
 * load-bearing: `getComponentImports` sorts its input array **in place**
 * (`components.sort(...)`), so reusing the same component/array reference
 * across tests would let one test's sort reorder another test's input.
 */
export const makeComponent = (
  overrides: Partial<ComponentDefinition> = {}
): ComponentDefinition => ({
  access: "public",
  tagName: "kst-sample",
  className: "KstSample",
  description: "A sample component.",
  fullClassJSDoc: "/**\n * A sample component.\n */",
  srcPath: "./kst-sample.ts",
  developmentStatus: "stable",
  mode: "open",
  shadow: true,
  ...overrides
});

/** Builds a fresh property with sensible defaults. */
export const makeProperty = (
  overrides: Partial<ComponentDefinitionProperty> = {}
): ComponentDefinitionProperty => ({
  attribute: "value",
  default: "undefined",
  name: "value",
  type: "string",
  ...overrides
});

/** Builds a fresh event with sensible defaults. */
export const makeEvent = (
  overrides: Partial<ComponentDefinitionEvent> = {}
): ComponentDefinitionEvent => ({
  name: "change",
  detailType: "string",
  ...overrides
});

/** Builds a fresh method with sensible defaults. */
export const makeMethod = (
  overrides: Partial<ComponentDefinitionMethod> = {}
): ComponentDefinitionMethod => ({
  name: "doSomething",
  paramTypes: [],
  returnType: "void",
  ...overrides
});
