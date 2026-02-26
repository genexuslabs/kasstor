import { readFile, rm, mkdir, writeFile } from "fs/promises";
import { resolve, join } from "path";
import type { Modifier, Node, SourceFile, TypeNode, TypeReferenceNode } from "typescript";
import {
  SyntaxKind,
  ScriptTarget,
  ScriptKind,
  canHaveModifiers,
  createSourceFile,
  forEachChild,
  getModifiers,
  isClassDeclaration,
  isEnumDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isMethodSignature,
  isPropertySignature,
  isQualifiedName,
  isTypeAliasDeclaration,
  isTypeReferenceNode
} from "typescript";

import type { ComponentImportTypes, LibraryComponents } from "../typings/library-components.js";

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

const FILE_EXTENSION = ".ts";
const FILE_HEADER = "/** Auto-generated type declaration. Do not edit manually. */\n\n";

function isBuiltInType(typeName: string): boolean {
  return BUILT_IN_TYPES.has(typeName);
}

/**
 * Collects all import types from components into a map of file path → set of type names (single pass over components).
 */
function collectAllImportTypes(components: LibraryComponents): Map<string, Set<string>> {
  const importTypesMap = new Map<string, Set<string>>();
  for (const component of components) {
    const sources = [
      component.propertyImportTypes,
      component.eventImportTypes,
      component.methodImportTypes
    ].filter((t): t is ComponentImportTypes => t != null);
    for (const importTypes of sources) {
      for (const [filePath, typeNames] of Object.entries(importTypes)) {
        let set = importTypesMap.get(filePath);
        if (!set) {
          set = new Set();
          importTypesMap.set(filePath, set);
        }
        for (const typeName of typeNames) set.add(typeName);
      }
    }
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
      ? [resolve(basePath, basePathWithoutExt + ext), resolve(basePath, filePath)]
      : [resolve(basePath, filePath + ext)];

    for (const absolutePath of pathsToTry) {
      try {
        const content = await readFile(absolutePath, "utf-8");
        return { resolvedPath: absolutePath, content };
      } catch {
        // continue
      }
    }
  }
  return null;
}

function getTypeReferenceName(node: TypeReferenceNode): string | null {
  if (isIdentifier(node.typeName)) return node.typeName.text;
  if (isQualifiedName(node.typeName)) return node.typeName.right.text;
  return null;
}

function extractTypeDependencies(typeNode: TypeNode): Set<string> {
  const dependencies = new Set<string>();
  const visit = (node: Node) => {
    if (isTypeReferenceNode(node)) {
      const name = getTypeReferenceName(node);
      if (name && !isBuiltInType(name)) dependencies.add(name);
    }
    forEachChild(node, visit);
  };
  visit(typeNode);
  return dependencies;
}

function hasExportModifier(node: Node): boolean {
  if (!canHaveModifiers(node)) return false;
  const modifiers = getModifiers(node);
  return modifiers?.some((mod: Modifier) => mod.kind === SyntaxKind.ExportKeyword) ?? false;
}

function extractTypeDeclarationsFromFile(
  sourceFile: SourceFile,
  fileContent: string
): Map<string, TypeDeclaration> {
  const typeDeclarations = new Map<string, TypeDeclaration>();

  const visit = (node: Node) => {
    const isExported = hasExportModifier(node);

    if (isTypeAliasDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies: extractTypeDependencies(node.type)
      });
    } else if (isInterfaceDeclaration(node) && node.name) {
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
        if (isPropertySignature(member) && member.type) {
          extractTypeDependencies(member.type).forEach(d => dependencies.add(d));
        } else if (isMethodSignature(member)) {
          if (member.type) extractTypeDependencies(member.type).forEach(d => dependencies.add(d));
          for (const param of member.parameters) {
            if (param.type) extractTypeDependencies(param.type).forEach(d => dependencies.add(d));
          }
        }
      }
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies
      });
    } else if (isEnumDeclaration(node) && node.name) {
      const typeName = node.name.text;
      const declaration = fileContent.substring(node.pos, node.end).trim();
      typeDeclarations.set(typeName, {
        name: typeName,
        declaration,
        isExported,
        dependencies: new Set()
      });
    } else if (isClassDeclaration(node) && node.name) {
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
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return typeDeclarations;
}

async function parseFilesAndExtractTypes(
  importTypesMap: Map<string, Set<string>>,
  basePath: string
): Promise<FileTypeMap> {
  const filePaths = [...importTypesMap.keys()];
  const resolvedList = await Promise.all(
    filePaths.map(filePath =>
      resolveFilePathWithExtensions(basePath, filePath).then(r => ({ filePath, resolved: r }))
    )
  );
  const fileTypeMap: FileTypeMap = new Map();
  for (const { filePath, resolved } of resolvedList) {
    if (!resolved) continue;
    const sourceFile = createSourceFile(
      filePath,
      resolved.content,
      ScriptTarget.ES2022,
      true,
      ScriptKind.TS
    );
    fileTypeMap.set(filePath, extractTypeDeclarationsFromFile(sourceFile, resolved.content));
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
 * Collects all requested type names plus their transitive dependencies (iterative, single pass over type graph).
 */
function collectAllTypeNamesWithDependencies(
  importTypesMap: Map<string, Set<string>>,
  fileTypeMap: FileTypeMap,
  typeToFileMap: Map<string, string>
): Set<string> {
  const allTypeNames = new Set<string>();
  const stack: string[] = [];
  for (const typeNames of importTypesMap.values()) {
    for (const typeName of typeNames) stack.push(typeName);
  }
  const visited = new Set<string>();
  while (stack.length > 0) {
    const typeName = stack.pop()!;
    if (visited.has(typeName)) continue;
    visited.add(typeName);
    const typeDecl = fileTypeMap.get(typeToFileMap.get(typeName)!)?.get(typeName);
    if (!typeDecl) continue;
    allTypeNames.add(typeName);
    for (const dep of typeDecl.dependencies) stack.push(dep);
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

  let fileTypeMap: FileTypeMap = new Map();
  let typeToFileMap = new Map<string, string>();
  let allTypeNames = new Set<string>();

  if (importTypesMap.size > 0) {
    fileTypeMap = await parseFilesAndExtractTypes(importTypesMap, basePath);
    typeToFileMap = buildTypeToFileMap(fileTypeMap);
    allTypeNames = collectAllTypeNamesWithDependencies(importTypesMap, fileTypeMap, typeToFileMap);
  }

  await rm(outputDir, { recursive: true }).catch(() => {});
  await mkdir(outputDir, { recursive: true });

  const writes: Promise<void>[] = [];
  for (const typeName of allTypeNames) {
    const typeDecl = fileTypeMap.get(typeToFileMap.get(typeName)!)?.get(typeName);
    if (!typeDecl) continue;

    const importLinesArr: string[] = [];
    for (const dep of typeDecl.dependencies) {
      if (allTypeNames.has(dep)) importLinesArr.push(`import type { ${dep} } from "./${dep}";`);
    }
    const importLines = importLinesArr.length > 0 ? importLinesArr.sort().join("\n") + "\n\n" : "";

    let declaration = typeDecl.declaration.trim();
    if (!typeDecl.isExported && !declaration.startsWith("export ")) {
      declaration = "export " + declaration;
    }
    const content = `${FILE_HEADER}${importLines}${declaration}\n`;
    writes.push(
      writeFile(join(outputDir, `${typeName}${FILE_EXTENSION}`), content, "utf-8")
    );
  }
  await Promise.all(writes);
}

