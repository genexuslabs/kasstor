import { resolve } from "path";
import type { SourceFile, StringLiteral } from "typescript";
import { isImportDeclaration, isNamedImports, isNamespaceImport } from "typescript";
import { resolveModulePath } from "./normalize-path.js";

/**
 * Type information extracted from imports
 */
export type ImportInfo = {
  namedImports: Set<string>;
  typeImports: Set<string>;
  defaultImport?: string;
  namespaceImport?: string;
  modulePath: string;
};

/**
 * Cache for import analysis
 */
export type ImportAnalysisCache = {
  importsByModule: Map<string, ImportInfo>;
  typeUsageMap: Map<string, string>; // typeName -> modulePath
};

/**
 * Extract import analysis from source file
 */
export const extractImportAnalysis = (
  sourceFile: SourceFile,
  searchPath: string,
  srcPath: string
): ImportAnalysisCache => {
  const importsByModule = new Map<string, ImportInfo>();
  const typeUsageMap = new Map<string, string>();

  // Get the absolute path of the current file
  const currentFilePath = resolve(searchPath, srcPath);

  // Extract import declarations
  sourceFile.statements.forEach(statement => {
    if (isImportDeclaration(statement) && statement.moduleSpecifier) {
      const moduleSpecifier = (statement.moduleSpecifier as StringLiteral)
        .text;

      // Resolve and normalize the module path
      const resolvedModulePath = resolveModulePath(
        moduleSpecifier,
        currentFilePath,
        searchPath
      );

      const importInfo: ImportInfo = {
        namedImports: new Set(),
        typeImports: new Set(),
        modulePath: resolvedModulePath
      };

      if (statement.importClause) {
        // Default import
        if (statement.importClause.name) {
          importInfo.defaultImport = statement.importClause.name.text;
          typeUsageMap.set(
            statement.importClause.name.text,
            resolvedModulePath
          );
        }

        // Named imports
        if (statement.importClause.namedBindings) {
          if (isNamespaceImport(statement.importClause.namedBindings)) {
            // namespace import (import * as foo from 'bar')
            importInfo.namespaceImport =
              statement.importClause.namedBindings.name.text;
            typeUsageMap.set(
              statement.importClause.namedBindings.name.text,
              resolvedModulePath
            );
          } else if (isNamedImports(statement.importClause.namedBindings)) {
            // named imports (import { foo, bar } from 'baz')
            statement.importClause.namedBindings.elements.forEach(element => {
              const importName = element.name.text;
              const isTypeOnly =
                element.isTypeOnly || statement.importClause?.isTypeOnly;

              if (isTypeOnly) {
                importInfo.typeImports.add(importName);
              } else {
                importInfo.namedImports.add(importName);
              }

              typeUsageMap.set(importName, resolvedModulePath);
            });
          }
        }
      }

      importsByModule.set(resolvedModulePath, importInfo);
    }
  });

  return {
    importsByModule,
    typeUsageMap
  };
};

