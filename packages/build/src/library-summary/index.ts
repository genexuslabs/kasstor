import { relative } from "path";

import type { KasstorBuildComponentData } from "../types";
import { extractComponentDefinition } from "./internal/extract-component-definition.js";
import { findComponents } from "./internal/find-lit-components.js";
import { ComponentValidator } from "./internal/validate-components.js";
import type { ComponentDefinition } from "./types";

const filterExcludedPublicMethods = (
  component: ComponentDefinition,
  excludedPublicMethods: string[] | undefined
) => {
  if (excludedPublicMethods && component.methods) {
    component.methods = component.methods.filter(
      method => !excludedPublicMethods.includes(method.name)
    );

    // Remove methods array if empty
    if (component.methods.length === 0) {
      component.methods = undefined;
    }
  }
};

/**
 * Generate a library summary by analyzing all components in a directory
 */
export const getLibraryComponents = async (options: {
  customDecoratorNames: string[] | undefined;
  defaultComponentAccess: ComponentDefinition["access"];
  excludedPaths: RegExp | RegExp[] | undefined;
  excludedPublicMethods: string[] | undefined;
  includedPaths: RegExp | RegExp[];
  relativeComponentsSrcPath: string;
}): Promise<KasstorBuildComponentData[]> => {
  const {
    customDecoratorNames,
    defaultComponentAccess,
    excludedPaths,
    excludedPublicMethods,
    includedPaths,
    relativeComponentsSrcPath
  } = options;

  // Find all component files
  const filePathAndContents = await findComponents({
    excludedPaths: excludedPaths ?? [],
    includedPaths,
    pattern: relativeComponentsSrcPath
  });

  const componentsAndContents: KasstorBuildComponentData[] = [];
  const validator = new ComponentValidator();

  // Process files sequentially to validate incrementally
  for (const { filePath, fileContent } of filePathAndContents) {
    try {
      const relativePath = relative(relativeComponentsSrcPath, filePath);

      const result = await extractComponentDefinition(
        fileContent,
        relativePath,
        relativeComponentsSrcPath,
        defaultComponentAccess,
        customDecoratorNames
      );

      if (result) {
        const { component, sourceFile, classDeclaration } = result;

        // Filter out excluded public methods if specified
        filterExcludedPublicMethods(component, excludedPublicMethods);

        // Validate component incrementally (throws if errors found)
        validator.validateAndAdd(component, sourceFile, classDeclaration);

        componentsAndContents.push({ component, fileContent, filePath });
      }
    } catch (error) {
      // Re-throw validation errors, warn on other errors
      if (
        error instanceof Error &&
        error.message.includes("Validation errors")
      ) {
        throw error;
      }
      console.warn(`[kasstor] Failed to process file ${filePath}:`, error);
    }
  }

  return componentsAndContents;
};

