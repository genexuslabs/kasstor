/**
 * Built-in types that should be excluded from type extraction
 */
const BUILT_IN_TYPES = new Set([
  "String",
  "Number",
  "Boolean",
  "Object",
  "Array",
  "Date",
  "RegExp",
  "Error",
  "Promise",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "HTMLElement",
  "Element",
  "Node",
  "Document",
  "Window",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "InputEvent",
  "EventTarget",
  "EventListener",
  "Function",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "Awaited",
  "Capitalize",
  "Uncapitalize",
  "Uppercase",
  "Lowercase",
  "Parameters",
  "ConstructorParameters",
  "ReturnType",
  "InstanceType",
  "ThisParameterType",
  "OmitThisParameter",
  "ThisType",
  "any",
  "void",
  "never",
  "unknown"
]);

/**
 * Check if a type is a built-in TypeScript/JavaScript type
 */
const isBuiltInType = (typeName: string): boolean => {
  return (
    BUILT_IN_TYPES.has(typeName) || BUILT_IN_TYPES.has(typeName.split(".")[0])
  );
};

/**
 * Extract types from a type string
 */
export const extractTypesFromTypeString = (typeString: string): Set<string> => {
  const types = new Set<string>();

  // Enhanced regex to handle more complex type patterns including namespaced types
  const typePattern = /\b([A-Z][a-zA-Z0-9_]*(?:\.[A-Z][a-zA-Z0-9_]*)*)\b/g;
  let match;

  while ((match = typePattern.exec(typeString)) !== null) {
    const typeName = match[1];
    // Exclude built-in types and common keywords
    if (!isBuiltInType(typeName)) {
      types.add(typeName);
    }
  }

  return types;
};

