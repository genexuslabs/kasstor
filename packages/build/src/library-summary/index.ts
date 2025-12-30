import { readFile } from "fs/promises";
import { relative } from "path";
import { extractComponentDefinition } from "./internal/extract-component-definition.js";
import { findLitComponents } from "./internal/find-lit-components.js";
import { ComponentValidator } from "./internal/validate-components.js";
import type { ComponentDefinition, LibraryComponents } from "./types";

/**
 * Generate a library summary by analyzing all components in a directory
 */
export const getLibrarySummary = async (options: {
  customDecoratorNames: string[] | undefined;
  defaultComponentAccess: ComponentDefinition["access"];
  excludedPaths: string[] | undefined;
  excludedPublicMethods: string[] | undefined;
  includedPaths: RegExp | RegExp[];
  relativeComponentsSrcPath: string;
}): Promise<LibraryComponents> => {
  const {
    customDecoratorNames,
    defaultComponentAccess,
    excludedPaths,
    excludedPublicMethods,
    includedPaths,
    relativeComponentsSrcPath
  } = options;

  // Find all component files
  const litFiles = await findLitComponents({
    excludedPaths: excludedPaths ?? [],
    includedPaths,
    pattern: relativeComponentsSrcPath
  });

  const components: LibraryComponents = [];
  const validator = new ComponentValidator();

  // Process files sequentially to validate incrementally
  for (const filePath of litFiles) {
    try {
      const fileContent = await readFile(filePath, "utf-8");
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
        if (excludedPublicMethods && component.methods) {
          component.methods = component.methods.filter(
            method => !excludedPublicMethods.includes(method.name)
          );

          // Remove methods array if empty
          if (component.methods.length === 0) {
            component.methods = undefined;
          }
        }

        // Validate component incrementally (throws if errors found)
        validator.validateAndAdd(component, sourceFile, classDeclaration);

        components.push(component);
      }
    } catch (error) {
      // Re-throw validation errors, warn on other errors
      if (
        error instanceof Error &&
        error.message.includes("Validation errors")
      ) {
        throw error;
      }
      console.warn(`Failed to process file ${filePath}:`, error);
    }
  }

  return components;
};

