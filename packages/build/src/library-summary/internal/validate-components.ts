import * as path from "path";
import * as ts from "typescript";

import type { ComponentDefinition } from "../../typings/library-components";

/**
 * Error information with location details
 */
export type ValidationError = {
  message: string;
  path: string;
  line: number;
  column: number;
};

/**
 * Options for the validator to improve duplicate-type error messages when
 * the conflict involves the auto-generated export types file (e.g. components.ts).
 */
export type ComponentValidatorOptions = {
  /**
   * Absolute path where the export types file is generated (e.g. components.ts).
   * Used to detect when a duplicate type is caused by importing from that file.
   */
  generatedExportTypesFilePath: string;
  /**
   * Resolves an import module path to an absolute path given the component's srcPath.
   * Used to compare import paths with `generatedExportTypesFilePath`.
   */
  resolveModulePathToAbsolute: (modulePath: string, componentSrcPath: string) => string;
};

/**
 * Returns true if the two paths refer to the same file (ignoring .ts vs .js extension).
 */
function pathsReferToSameFile(absolutePathA: string, absolutePathB: string): boolean {
  const normA = path.normalize(absolutePathA);
  const normB = path.normalize(absolutePathB);
  if (normA === normB) return true;
  const baseA = normA.replace(/\.(ts|d\.ts|tsx|js)$/i, "");
  const baseB = normB.replace(/\.(ts|d\.ts|tsx|js)$/i, "");
  return baseA === baseB;
}

/**
 * Incremental validator that checks components as they are analyzed
 */
export class ComponentValidator {
  private readonly options: ComponentValidatorOptions | undefined;
  private seenTagNames = new Map<string, ComponentDefinition>();
  private seenClassNames = new Map<string, ComponentDefinition>();
  private seenTypeDefinitions = new Map<
    string,
    { modulePath: string; component: ComponentDefinition }
  >();
  private componentMembers = new Map<
    string,
    {
      properties: Set<string>;
      events: Set<string>;
      methods: Set<string>;
    }
  >();

  constructor(options?: ComponentValidatorOptions) {
    this.options = options;
  }

  /**
   * Validate a component and add it to the tracked components
   * Throws an error if validation fails with file location information
   */
  validateAndAdd(
    component: ComponentDefinition,
    sourceFile: ts.SourceFile,
    classDeclaration: ts.ClassDeclaration
  ): void {
    const errors: ValidationError[] = [];

    // Check for duplicate tag names
    if (this.seenTagNames.has(component.tagName)) {
      const existing = this.seenTagNames.get(component.tagName)!;
      const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
      errors.push({
        message: `Duplicate tag name "${component.tagName}". Already defined in ${existing.srcPath}`,
        path: component.srcPath,
        line,
        column
      });
    } else {
      this.seenTagNames.set(component.tagName, component);
    }

    // Check for duplicate class names
    if (this.seenClassNames.has(component.className)) {
      const existing = this.seenClassNames.get(component.className)!;
      const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
      errors.push({
        message: `Duplicate class name "${component.className}". Already defined in ${existing.srcPath}`,
        path: component.srcPath,
        line,
        column
      });
    } else {
      this.seenClassNames.set(component.className, component);
    }

    // Track type definitions from import types
    // A type definition is considered duplicate if the same type name is defined in different modules
    const allImportTypes = [
      ...(component.propertyImportTypes ? Object.entries(component.propertyImportTypes) : []),
      ...(component.eventImportTypes ? Object.entries(component.eventImportTypes) : []),
      ...(component.methodImportTypes ? Object.entries(component.methodImportTypes) : [])
    ];

    allImportTypes.forEach(([modulePath, typeNames]) => {
      typeNames.forEach(typeName => {
        // Check if this type name was already defined in a different module
        if (this.seenTypeDefinitions.has(typeName)) {
          const existing = this.seenTypeDefinitions.get(typeName)!;
          // Only report error if the type is defined in a different module
          if (existing.modulePath !== modulePath) {
            const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
            let message = `Duplicate type definition "${typeName}". Already defined in module "${existing.modulePath}", but found in module "${modulePath}"`;
            const hint = this.getImportFromGeneratedFileHint(
              typeName,
              existing.modulePath,
              existing.component.srcPath,
              modulePath,
              component.srcPath
            );

            if (hint) {
              message += hint;
            }

            errors.push({
              message,
              path: component.srcPath,
              line,
              column
            });
          }
        } else {
          // Track this type definition
          this.seenTypeDefinitions.set(typeName, {
            modulePath,
            component
          });
        }
      });
    });

    // Check for duplicate properties, events, and methods within the component
    const propertyNames = new Set<string>();
    const eventNames = new Set<string>();
    const methodNames = new Set<string>();

    // Check properties
    component.properties?.forEach(prop => {
      if (propertyNames.has(prop.name)) {
        const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
        errors.push({
          message: `Duplicate property name "${prop.name}" in component "${component.className}"`,
          path: component.srcPath,
          line,
          column
        });
      } else {
        propertyNames.add(prop.name);
      }
    });

    // Check events
    component.events?.forEach(event => {
      if (eventNames.has(event.name)) {
        const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
        errors.push({
          message: `Duplicate event name "${event.name}" in component "${component.className}"`,
          path: component.srcPath,
          line,
          column
        });
      } else {
        eventNames.add(event.name);
      }
    });

    // Check methods
    component.methods?.forEach(method => {
      if (methodNames.has(method.name)) {
        const { line, column } = this.getLineAndColumn(sourceFile, classDeclaration);
        errors.push({
          message: `Duplicate method name "${method.name}" in component "${component.className}"`,
          path: component.srcPath,
          line,
          column
        });
      } else {
        methodNames.add(method.name);
      }
    });

    // Store members for this component
    this.componentMembers.set(component.className, {
      properties: propertyNames,
      events: eventNames,
      methods: methodNames
    });

    // Throw error if any validation errors found
    if (errors.length > 0) {
      const errorMessages = errors
        .map(error => `${error.path}:${error.line}:${error.column} - ${error.message}`)
        .join("\n");
      throw new Error(`Validation errors found:\n${errorMessages}`);
    }
  }

  /**
   * If the duplicate involves the auto-generated export types file, returns a hint
   * telling the user to remove the import from that file. Otherwise returns undefined.
   */
  private getImportFromGeneratedFileHint(
    _typeName: string,
    existingModulePath: string,
    existingComponentSrcPath: string,
    currentModulePath: string,
    currentComponentSrcPath: string
  ): string | undefined {
    if (!this.options) return undefined;
    const { generatedExportTypesFilePath, resolveModulePathToAbsolute } = this.options;
    const resolvedExisting = path.normalize(
      resolveModulePathToAbsolute(existingModulePath, existingComponentSrcPath)
    );
    const resolvedCurrent = path.normalize(
      resolveModulePathToAbsolute(currentModulePath, currentComponentSrcPath)
    );
    const generatedNormalized = path.normalize(generatedExportTypesFilePath);
    const existingIsGenerated = pathsReferToSameFile(resolvedExisting, generatedNormalized);
    const currentIsGenerated = pathsReferToSameFile(resolvedCurrent, generatedNormalized);
    if (!existingIsGenerated && !currentIsGenerated) return undefined;
    return " This often happens when a component imports a type from the auto-generated export types file (e.g. components.ts). Remove that import and import the type from its original module instead.";
  }

  /**
   * Get line and column numbers from a node in the source file
   */
  private getLineAndColumn(
    sourceFile: ts.SourceFile,
    node: ts.Node
  ): { line: number; column: number } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return {
      line: line + 1, // Convert to 1-based line numbering
      column: character + 1 // Convert to 1-based column numbering
    };
  }
}

