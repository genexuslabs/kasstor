import type {
  ComponentDefinitionEvent,
  ComponentDefinitionMethod,
  ComponentDefinitionProperty,
  ComponentImportTypes
} from "../types";
import type { ImportAnalysisCache } from "./extract-import-analysis";
import { extractTypesFromTypeString } from "./extract-types-from-string.js";

/**
 * Extract import types needed for properties
 */
export const extractImportTypesForProperties = (
  properties: ComponentDefinitionProperty[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes => {
  const importTypes: ComponentImportTypes = {};

  properties.forEach(property => {
    const typesUsed = extractTypesFromTypeString(property.type);

    typesUsed.forEach(typeName => {
      const modulePath = importAnalysis.typeUsageMap.get(typeName);
      if (modulePath) {
        importTypes[modulePath] ||= [];
        if (!importTypes[modulePath].includes(typeName)) {
          importTypes[modulePath].push(typeName);
        }
      }
    });
  });

  return importTypes;
};

/**
 * Extract import types needed for events
 */
export const extractImportTypesForEvents = (
  events: ComponentDefinitionEvent[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes => {
  const importTypes: ComponentImportTypes = {};

  events.forEach(event => {
    const typesUsed = extractTypesFromTypeString(event.detailType);

    typesUsed.forEach(typeName => {
      const modulePath = importAnalysis.typeUsageMap.get(typeName);
      if (modulePath) {
        importTypes[modulePath] ||= [];
        if (!importTypes[modulePath].includes(typeName)) {
          importTypes[modulePath].push(typeName);
        }
      }
    });
  });

  return importTypes;
};

/**
 * Extract import types needed for methods
 */
export const extractImportTypesForMethods = (
  methods: ComponentDefinitionMethod[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes => {
  const importTypes: ComponentImportTypes = {};

  methods.forEach(method => {
    // Extract types from return type
    const returnTypesUsed = extractTypesFromTypeString(method.returnType);

    // Extract types from parameter types
    const paramTypesUsed = new Set<string>();
    method.paramTypes.forEach(param => {
      const types = extractTypesFromTypeString(param.type);
      types.forEach(type => paramTypesUsed.add(type));
    });

    // Combine all types used in this method
    const allTypesUsed = new Set([...returnTypesUsed, ...paramTypesUsed]);

    allTypesUsed.forEach(typeName => {
      const modulePath = importAnalysis.typeUsageMap.get(typeName);
      if (modulePath) {
        importTypes[modulePath] ||= [];
        if (!importTypes[modulePath].includes(typeName)) {
          importTypes[modulePath].push(typeName);
        }
      }
    });
  });

  return importTypes;
};

