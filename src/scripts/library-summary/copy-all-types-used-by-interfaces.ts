import * as fs from "fs/promises";
import * as path from "path";
import * as ts from "typescript";
import type { ComponentImportTypes, LibraryComponents } from "./types";

/**
 * Represents a type declaration with its dependencies
 */
type TypeDeclaration = {
  name: string;
  declaration: string;
  isExported: boolean;
  dependencies: Set<string>; // Other type names this type depends on
};

/**
 * Map of file paths to their exported types
 */
type FileTypeMap = Map<string, Map<string, TypeDeclaration>>;

/**
 * Cache for parsed source files
 */
const sourceFileCache = new Map<string, ts.SourceFile>();

/**
 * Main function to copy all types used by component interfaces
 */
export async function copyAllTypesUsedByInterfaces(
  components: LibraryComponents,
  basePath: string
): Promise<string> {
  // Step 1: Collect all import types from all components
  const allImportTypes = collectAllImportTypes(components);

  // Step 2: Parse all files and extract type declarations
  const fileTypeMap = await parseFilesAndExtractTypes(allImportTypes, basePath);

  // Step 3: Resolve transitive dependencies
  const typesToInclude = resolveTransitiveDependencies(
    allImportTypes,
    fileTypeMap
  );

  // Step 4: Generate the output file content
  const outputContent = generateOutputContent(typesToInclude, fileTypeMap);

  return outputContent;
}

/**
 * Collect all import types from all components
 */
function collectAllImportTypes(
  components: LibraryComponents
): Map<string, Set<string>> {
  const importTypesMap = new Map<string, Set<string>>();

  for (const component of components) {
    // Collect from propertyImportTypes
    if (component.propertyImportTypes) {
      mergeImportTypes(importTypesMap, component.propertyImportTypes);
    }

    // Collect from eventImportTypes
    if (component.eventImportTypes) {
      mergeImportTypes(importTypesMap, component.eventImportTypes);
    }

    // Collect from methodImportTypes
    if (component.methodImportTypes) {
      mergeImportTypes(importTypesMap, component.methodImportTypes);
    }
  }

  return importTypesMap;
}

/**
 * Merge import types into the map, avoiding duplicates
 */
function mergeImportTypes(
  targetMap: Map<string, Set<string>>,
  importTypes: ComponentImportTypes
): void {
  for (const [filePath, typeNames] of Object.entries(importTypes)) {
    if (!targetMap.has(filePath)) {
      targetMap.set(filePath, new Set());
    }
    const typeSet = targetMap.get(filePath)!;
    for (const typeName of typeNames) {
      typeSet.add(typeName);
    }
  }
}

/**
 * Try to resolve a file path with different extensions
 * This handles cases where imports reference .js but the actual file is .ts or .d.ts
 */
async function resolveFilePathWithExtensions(
  basePath: string,
  filePath: string
): Promise<{ resolvedPath: string; content: string } | null> {
  // List of extensions to try, in order of preference
  const extensionsToTry = [
    "", // Try the original path first
    ".ts", // TypeScript source
    ".d.ts", // TypeScript declaration file
    ".tsx" // TypeScript with JSX
  ];

  // If the file has a .js extension, also try replacing it
  const basePathWithoutExt = filePath.replace(/\.js$/, "");
  const hasJsExtension = filePath.endsWith(".js");

  for (const ext of extensionsToTry) {
    const pathsToTry = hasJsExtension
      ? [
          path.resolve(basePath, basePathWithoutExt + ext),
          path.resolve(basePath, filePath)
        ]
      : [path.resolve(basePath, filePath + ext)];

    for (const absolutePath of pathsToTry) {
      try {
        const content = await fs.readFile(absolutePath, "utf-8");
        return { resolvedPath: absolutePath, content };
      } catch {
        // Continue to next extension
      }
    }
  }

  return null;
}

/**
 * Parse all files and extract type declarations
 */
async function parseFilesAndExtractTypes(
  importTypesMap: Map<string, Set<string>>,
  basePath: string
): Promise<FileTypeMap> {
  const fileTypeMap: FileTypeMap = new Map();

  for (const [filePath] of importTypesMap) {
    try {
      const resolved = await resolveFilePathWithExtensions(basePath, filePath);

      if (!resolved) {
        console.warn(
          `Failed to resolve file ${filePath} with any known extension`
        );
        continue;
      }

      const { content: fileContent } = resolved;

      const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.ES2022,
        true,
        ts.ScriptKind.TS
      );

      sourceFileCache.set(filePath, sourceFile);

      const typeDeclarations = extractTypeDeclarationsFromFile(
        sourceFile,
        fileContent
      );
      fileTypeMap.set(filePath, typeDeclarations);
    } catch (error) {
      console.warn(`Failed to parse file ${filePath}:`, error);
    }
  }

  return fileTypeMap;
}

/**
 * Extract type declarations from a source file
 */
function extractTypeDeclarationsFromFile(
  sourceFile: ts.SourceFile,
  fileContent: string
): Map<string, TypeDeclaration> {
  const typeDeclarations = new Map<string, TypeDeclaration>();

  const visit = (node: ts.Node) => {
    // Check if node is exported
    const isExported = hasExportModifier(node);

    // Type alias declaration
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      const dependencies = extractTypeDependencies(node.type);

      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies
      });
    }
    // Interface declaration
    else if (ts.isInterfaceDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      const dependencies = new Set<string>();

      // Extract dependencies from heritage clauses
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            const deps = extractTypeDependencies(type);
            deps.forEach(dep => dependencies.add(dep));
          }
        }
      }

      // Extract dependencies from members
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.type) {
          const deps = extractTypeDependencies(member.type);
          deps.forEach(dep => dependencies.add(dep));
        } else if (ts.isMethodSignature(member)) {
          if (member.type) {
            const deps = extractTypeDependencies(member.type);
            deps.forEach(dep => dependencies.add(dep));
          }
          for (const param of member.parameters) {
            if (param.type) {
              const deps = extractTypeDependencies(param.type);
              deps.forEach(dep => dependencies.add(dep));
            }
          }
        }
      }

      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies
      });
    }
    // Enum declaration
    else if (ts.isEnumDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();

      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies: new Set()
      });
    }
    // Class declaration (for type purposes)
    else if (ts.isClassDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      const dependencies = new Set<string>();

      // Extract dependencies from heritage clauses
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            const deps = extractTypeDependencies(type);
            deps.forEach(dep => dependencies.add(dep));
          }
        }
      }

      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return typeDeclarations;
}

/**
 * Check if a node has an export modifier
 */
function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }

  const modifiers = ts.getModifiers(node);
  if (!modifiers) {
    return false;
  }

  return modifiers.some(
    modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
}

/**
 * Extract type dependencies from a type node
 */
function extractTypeDependencies(typeNode: ts.TypeNode): Set<string> {
  const dependencies = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isTypeReferenceNode(node)) {
      const typeName = getTypeReferenceName(node);
      if (typeName && !isBuiltInType(typeName)) {
        dependencies.add(typeName);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(typeNode);

  return dependencies;
}

/**
 * Get the type reference name from a type reference node
 */
function getTypeReferenceName(node: ts.TypeReferenceNode): string | null {
  if (ts.isIdentifier(node.typeName)) {
    return node.typeName.text;
  }
  if (ts.isQualifiedName(node.typeName)) {
    // For qualified names like Namespace.Type, we only care about the rightmost part
    return node.typeName.right.text;
  }
  return null;
}

/**
 * Check if a type is a built-in TypeScript/JavaScript type
 */
function isBuiltInType(typeName: string): boolean {
  const builtInTypes = new Set([
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
    "FocusEvent",
    "PointerEvent",
    "TouchEvent",
    "WheelEvent",
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
    "NonNullable",
    "ReturnType",
    "InstanceType",
    "Parameters",
    "ConstructorParameters",
    "Awaited",
    "CSSStyleDeclaration",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLDivElement",
    "HTMLSpanElement",
    "CustomEvent",
    "ShadowRoot",
    "DocumentFragment"
  ]);

  return builtInTypes.has(typeName);
}

/**
 * Resolve transitive dependencies for all requested types
 */
function resolveTransitiveDependencies(
  importTypesMap: Map<string, Set<string>>,
  fileTypeMap: FileTypeMap
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  // Build a global type name to file path mapping
  const typeToFileMap = new Map<string, string>();
  for (const [filePath, typeDeclarations] of fileTypeMap) {
    for (const typeName of typeDeclarations.keys()) {
      typeToFileMap.set(typeName, filePath);
    }
  }

  // Process each file's requested types
  for (const [filePath, requestedTypes] of importTypesMap) {
    const typesToInclude = new Set<string>();

    for (const typeName of requestedTypes) {
      // Add the type and all its transitive dependencies
      addTypeWithDependencies(
        typeName,
        filePath,
        typesToInclude,
        fileTypeMap,
        typeToFileMap,
        new Set()
      );
    }

    if (typesToInclude.size > 0) {
      result.set(filePath, typesToInclude);
    }
  }

  return result;
}

/**
 * Recursively add a type and all its dependencies
 */
function addTypeWithDependencies(
  typeName: string,
  currentFilePath: string,
  typesToInclude: Set<string>,
  fileTypeMap: FileTypeMap,
  typeToFileMap: Map<string, string>,
  visited: Set<string>
): void {
  // Avoid circular dependencies
  if (visited.has(typeName)) {
    return;
  }
  visited.add(typeName);

  // Check if the type exists in the current file
  const currentFileTypes = fileTypeMap.get(currentFilePath);
  if (!currentFileTypes?.has(typeName)) {
    // Type might be in another file, try to find it
    const typeFilePath = typeToFileMap.get(typeName);
    if (!typeFilePath) {
      return; // Type not found, skip
    }

    // If the type is in a different file, we don't include it here
    // (it will be included when processing that file)
    if (typeFilePath !== currentFilePath) {
      return;
    }
  }

  // Add the type
  typesToInclude.add(typeName);

  // Get the type declaration
  const typeDeclaration = currentFileTypes?.get(typeName);
  if (!typeDeclaration) {
    return;
  }

  // Recursively add dependencies
  for (const dependency of typeDeclaration.dependencies) {
    addTypeWithDependencies(
      dependency,
      currentFilePath,
      typesToInclude,
      fileTypeMap,
      typeToFileMap,
      visited
    );
  }
}

/**
 * Generate the output file content
 */
function generateOutputContent(
  typesToInclude: Map<string, Set<string>>,
  fileTypeMap: FileTypeMap
): string {
  const sections: string[] = [];

  // Add header comment
  sections.push(`/**
 * This file contains all type definitions used by component interfaces.
 * It is auto-generated to provide LLMs with easy access to type definitions
 * without needing to navigate to individual export files.
 * 
 * DO NOT EDIT THIS FILE MANUALLY - it will be regenerated.
 */
`);

  // Process each file
  for (const [filePath, typeNames] of typesToInclude) {
    const fileTypes = fileTypeMap.get(filePath);
    if (!fileTypes) {
      continue;
    }

    // Add file section header
    sections.push(
      `\n// ============================================================================`
    );
    sections.push(`// Types from: ${filePath}`);
    sections.push(
      `// ============================================================================\n`
    );

    // Sort type names for consistent output
    const sortedTypeNames = Array.from(typeNames).sort();

    // Add each type declaration
    for (const typeName of sortedTypeNames) {
      const typeDecl = fileTypes.get(typeName);
      if (!typeDecl) {
        continue;
      }

      // Clean up the declaration (remove extra whitespace, ensure it starts with export)
      let declaration = typeDecl.declaration.trim();

      // If the type is exported in the original file, keep the export
      // If not, add export so it's available in this file
      if (!typeDecl.isExported && !declaration.startsWith("export ")) {
        declaration = "export " + declaration;
      }

      sections.push(declaration);
      sections.push(""); // Empty line between declarations
    }
  }

  return sections.join("\n");
}

