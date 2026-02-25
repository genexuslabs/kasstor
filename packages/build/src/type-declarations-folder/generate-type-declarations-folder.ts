import * as fs from "fs/promises";
import * as path from "path";
import * as ts from "typescript";

import type {
  ComponentImportTypes,
  LibraryComponents
} from "../typings/library-components.js";

/**
 * Represents a type declaration with its dependencies.
 */
type TypeDeclaration = {
  name: string;
  declaration: string;
  isExported: boolean;
  dependencies: Set<string>;
};

/**
 * Map of file paths (as in ComponentImportTypes) to their extracted type declarations.
 */
type FileTypeMap = Map<string, Map<string, TypeDeclaration>>;

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

function isBuiltInType(typeName: string): boolean {
  return BUILT_IN_TYPES.has(typeName);
}

/**
 * Collects all import types from components into a map of file path → set of type names.
 * Uses a single Set of type names to avoid duplicates across property/event/method imports.
 */
function collectAllImportTypes(
  components: LibraryComponents
): Map<string, Set<string>> {
  const importTypesMap = new Map<string, Set<string>>();

  const merge = (importTypes: ComponentImportTypes) => {
    for (const [filePath, typeNames] of Object.entries(importTypes)) {
      if (!importTypesMap.has(filePath)) {
        importTypesMap.set(filePath, new Set());
      }
      const set = importTypesMap.get(filePath)!;
      for (const typeName of typeNames) {
        set.add(typeName);
      }
    }
  };

  for (const component of components) {
    if (component.propertyImportTypes) merge(component.propertyImportTypes);
    if (component.eventImportTypes) merge(component.eventImportTypes);
    if (component.methodImportTypes) merge(component.methodImportTypes);
  }

  return importTypesMap;
}

/**
 * Resolves a file path trying different extensions (.ts, .d.ts, .tsx, or as-is).
 */
async function resolveFilePathWithExtensions(
  basePath: string,
  filePath: string
): Promise<{ resolvedPath: string; content: string } | null> {
  const extensionsToTry = ["", ".ts", ".d.ts", ".tsx"];
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
        // continue
      }
    }
  }
  return null;
}

function getTypeReferenceName(node: ts.TypeReferenceNode): string | null {
  if (ts.isIdentifier(node.typeName)) return node.typeName.text;
  if (ts.isQualifiedName(node.typeName)) return node.typeName.right.text;
  return null;
}

function extractTypeDependencies(typeNode: ts.TypeNode): Set<string> {
  const dependencies = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isTypeReferenceNode(node)) {
      const name = getTypeReferenceName(node);
      if (name && !isBuiltInType(name)) dependencies.add(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(typeNode);
  return dependencies;
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return (
    modifiers?.some(
      (mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function extractTypeDeclarationsFromFile(
  sourceFile: ts.SourceFile,
  fileContent: string
): Map<string, TypeDeclaration> {
  const typeDeclarations = new Map<string, TypeDeclaration>();

  const visit = (node: ts.Node) => {
    const isExported = hasExportModifier(node);

    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies: extractTypeDependencies(node.type)
      });
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      const dependencies = new Set<string>();
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            extractTypeDependencies(type).forEach(d => dependencies.add(d));
          }
        }
      }
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.type) {
          extractTypeDependencies(member.type).forEach(d => dependencies.add(d));
        } else if (ts.isMethodSignature(member)) {
          if (member.type)
            extractTypeDependencies(member.type).forEach(d => dependencies.add(d));
          for (const param of member.parameters) {
            if (param.type)
              extractTypeDependencies(param.type).forEach(d =>
                dependencies.add(d)
              );
          }
        }
      }
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies
      });
    } else if (ts.isEnumDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies: new Set()
      });
    } else if (ts.isClassDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      const dependencies = new Set<string>();
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            extractTypeDependencies(type).forEach(d => dependencies.add(d));
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

async function parseFilesAndExtractTypes(
  importTypesMap: Map<string, Set<string>>,
  basePath: string
): Promise<FileTypeMap> {
  const fileTypeMap: FileTypeMap = new Map();

  for (const [filePath] of importTypesMap) {
    const resolved = await resolveFilePathWithExtensions(basePath, filePath);
    if (!resolved) continue;
    const sourceFile = ts.createSourceFile(
      filePath,
      resolved.content,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    const typeDeclarations = extractTypeDeclarationsFromFile(
      sourceFile,
      resolved.content
    );
    fileTypeMap.set(filePath, typeDeclarations);
  }
  return fileTypeMap;
}

/**
 * Builds a global type name → file path map (first occurrence wins; validator ensures no duplicate type names across modules).
 */
function buildTypeToFileMap(fileTypeMap: FileTypeMap): Map<string, string> {
  const typeToFileMap = new Map<string, string>();
  for (const [filePath, typeDeclarations] of fileTypeMap) {
    for (const typeName of typeDeclarations.keys()) {
      if (!typeToFileMap.has(typeName)) {
        typeToFileMap.set(typeName, filePath);
      }
    }
  }
  return typeToFileMap;
}

/**
 * Collects all requested type names plus their transitive dependencies (across all files).
 */
function collectAllTypeNamesWithDependencies(
  importTypesMap: Map<string, Set<string>>,
  fileTypeMap: FileTypeMap,
  typeToFileMap: Map<string, string>
): Set<string> {
  const allTypeNames = new Set<string>();
  const visited = new Set<string>();

  function addType(typeName: string): void {
    if (visited.has(typeName)) return;
    visited.add(typeName);
    const filePath = typeToFileMap.get(typeName);
    if (!filePath) return;
    const fileTypes = fileTypeMap.get(filePath);
    const typeDecl = fileTypes?.get(typeName);
    if (!typeDecl) return;
    allTypeNames.add(typeName);
    for (const dep of typeDecl.dependencies) {
      addType(dep);
    }
  }

  for (const [, typeNames] of importTypesMap) {
    for (const typeName of typeNames) {
      addType(typeName);
    }
  }
  return allTypeNames;
}

/**
 * Generates one declaration file per type in the given output directory.
 * Each file is named `{typeName}.d.ts` and contains a single exported declaration.
 *
 * @param components - Library components (used to collect property/event/method import types).
 * @param basePath - Base path to resolve type source files. Must be the same base as component sources (e.g. `join(process.cwd(), relativeComponentsSrcPath)`), since import paths in the library summary are relative to that folder.
 * @param outputDir - Directory where to write the `.d.ts` files (e.g. `join(process.cwd(), 'docs/types')`).
 */
export async function generateTypeDeclarationsFolder(
  components: LibraryComponents,
  basePath: string,
  outputDir: string
): Promise<void> {
  const importTypesMap = collectAllImportTypes(components);
  if (importTypesMap.size === 0) return;

  const fileTypeMap = await parseFilesAndExtractTypes(importTypesMap, basePath);
  const typeToFileMap = buildTypeToFileMap(fileTypeMap);
  const allTypeNames = collectAllTypeNamesWithDependencies(
    importTypesMap,
    fileTypeMap,
    typeToFileMap
  );

  await fs.mkdir(outputDir, { recursive: true });

  for (const typeName of allTypeNames) {
    const filePath = typeToFileMap.get(typeName);
    if (!filePath) continue;
    const fileTypes = fileTypeMap.get(filePath);
    const typeDecl = fileTypes?.get(typeName);
    if (!typeDecl) continue;

    let declaration = typeDecl.declaration.trim();
    if (!typeDecl.isExported && !declaration.startsWith("export ")) {
      declaration = "export " + declaration;
    }
    const content = `/** Auto-generated type declaration. Do not edit manually. */\n\n${declaration}\n`;
    const outPath = path.join(outputDir, `${typeName}.d.ts`);
    await fs.writeFile(outPath, content, "utf-8");
  }
}
