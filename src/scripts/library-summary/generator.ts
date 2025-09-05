import * as fs from "fs/promises";
import * as path from "path";
import * as ts from "typescript";

import type {
  ComponentDefinition,
  ComponentDefinitionCssVariable,
  ComponentDefinitionEvent,
  ComponentDefinitionMethod,
  ComponentDefinitionPart,
  ComponentDefinitionProperty,
  ComponentDefinitionSlot,
  ComponentImportTypes,
  LibraryComponents
} from "./types";

// Types for package.json exports
type ExportCondition = {
  browser?: {
    development?: string;
    default?: string;
  };
  node?: {
    development?: string;
    default?: string;
  };
  types?: string;
  development?: string;
  default?: string;
};

type PackageExports = Record<string, ExportCondition>;

// Type information extracted from imports
type ImportInfo = {
  namedImports: Set<string>;
  typeImports: Set<string>;
  defaultImport?: string;
  namespaceImport?: string;
  modulePath: string;
};

// Cache for import analysis
type ImportAnalysisCache = {
  importsByModule: Map<string, ImportInfo>;
  typeUsageMap: Map<string, string>; // typeName -> modulePath
};

// Lit lifecycle methods that should be excluded from public API
const LIT_LIFECYCLE_METHODS = new Set([
  "connectedCallback",
  "disconnectedCallback",
  "adoptedCallback",
  "attributeChangedCallback",
  "requestUpdate",
  "performUpdate",
  "shouldUpdate",
  "willUpdate",
  "update",
  "render",
  "firstUpdated",
  "updated",
  "updateComplete",
  "getUpdateComplete",
  "scheduleUpdate",
  "createRenderRoot",
  "renderRoot"
]);

// Cache for parsed TypeScript files to improve performance
const sourceFileCache = new Map<string, ts.SourceFile>();
const importAnalysisCache = new Map<string, ImportAnalysisCache>();

/**
 * Normalize path to use forward slashes and make it relative to basePath
 */
function normalizeRelativePath(filePath: string, basePath: string): string {
  const relativePath = path.relative(basePath, filePath);
  return relativePath.replace(/\\/g, "/");
}

/**
 * Resolve module path and normalize it
 */
function resolveModulePath(
  moduleSpecifier: string,
  currentFilePath: string,
  searchPath: string
): string {
  if (moduleSpecifier.startsWith(".")) {
    // Relative import - resolve it relative to the current file
    const currentFileDir = path.dirname(currentFilePath);
    const resolvedPath = path.resolve(currentFileDir, moduleSpecifier);

    // Add .ts extension if not present and file exists, otherwise try other extensions
    let finalPath = resolvedPath;
    if (!path.extname(resolvedPath)) {
      const possibleExtensions = [".ts", ".js", ".d.ts"];
      for (const ext of possibleExtensions) {
        const pathWithExt = resolvedPath + ext;
        try {
          // We can't use async here, so we'll assume .ts for relative imports
          finalPath = resolvedPath + ".ts";
          break;
        } catch {
          // Continue to next extension
        }
      }
    }

    // Make it relative to searchPath and normalize
    return normalizeRelativePath(finalPath, searchPath);
  }
  // External module - return as is but normalized
  return moduleSpecifier.replace(/\\/g, "/");
}

/**
 * Main function to extract library components metadata from a directory
 */
export async function extractLibraryComponents(
  searchPath: string
): Promise<LibraryComponents> {
  const [litFiles, exportsMap] = await Promise.all([
    findLitComponents(searchPath),
    extractPackageJsonExports(path.join(searchPath, "package.json"))
  ]);

  const components: LibraryComponents = [];

  // Process files in parallel for better performance
  const componentPromises = litFiles.map(async filePath => {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const relativePath = path.relative(searchPath, filePath);

      const componentDef = extractComponentDefinition(
        fileContent,
        relativePath,
        searchPath
      );
      if (componentDef) {
        // Add package.json exports path if available
        componentDef.packageJsonExportsPath = findMatchingExportPath(
          componentDef,
          exportsMap,
          relativePath
        );

        return componentDef;
      }
    } catch (error) {
      console.warn(`Failed to process file ${filePath}:`, error);
    }
    return null;
  });

  const results = await Promise.all(componentPromises);

  // Filter out null results and add to components array
  for (const result of results) {
    if (result) {
      components.push(result);
    }
  }

  return components;
}

/**
 * Extract component definition from file content
 */
export function extractComponentDefinition(
  fileContent: string,
  srcPath: string,
  searchPath: string
): ComponentDefinition | null {
  // Check cache first
  const cacheKey = `${srcPath}:${fileContent.length}`;
  let sourceFile = sourceFileCache.get(cacheKey);

  if (!sourceFile) {
    sourceFile = ts.createSourceFile(
      srcPath,
      fileContent,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    sourceFileCache.set(cacheKey, sourceFile);
  }

  // Extract import information
  const importAnalysis = extractImportAnalysis(sourceFile, srcPath, searchPath);

  let componentClass: ts.ClassDeclaration | null = null;
  let componentDecorator: ts.Decorator | null = null;

  // Find the component class and its @Component decorator
  const findComponentClass = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.modifiers) {
      const decorator = node.modifiers.find(
        (mod): mod is ts.Decorator =>
          ts.isDecorator(mod) &&
          ts.isCallExpression(mod.expression) &&
          ts.isIdentifier(mod.expression.expression) &&
          // This allow us to support custom "Component" decorators
          mod.expression.expression.text.endsWith("Component")
      );

      if (decorator) {
        componentClass = node;
        componentDecorator = decorator;
        return;
      }
    }

    ts.forEachChild(node, findComponentClass);
  };

  findComponentClass(sourceFile);

  if (!componentClass || !componentDecorator) {
    return null;
  }

  const className = componentClass.name?.text;
  if (!className) {
    return null;
  }

  // Extract component metadata
  const decoratorConfig = extractDecoratorConfig(componentDecorator);
  const jsDocInfo = extractJSDocInfo(componentClass);

  const tagName = decoratorConfig.tag || "";
  // Shadow is true by default in the decorator
  const shadow = decoratorConfig.shadow !== false;
  const mode: "open" | "closed" = decoratorConfig.shadow?.mode || "open";
  const formAssociated = decoratorConfig.shadow?.formAssociated || false;

  // Extract properties, events, methods from class
  const [properties, events, methods] = extractClassMembers(
    componentClass,
    sourceFile,
    importAnalysis
  );

  // Extract import types for each category
  const propertyImportTypes = extractImportTypesForProperties(
    properties,
    importAnalysis
  );
  const eventImportTypes = extractImportTypesForEvents(events, importAnalysis);
  const methodImportTypes = extractImportTypesForMethods(
    methods,
    importAnalysis
  );

  return {
    tagName,
    className,
    description: jsDocInfo.description || "",
    srcPath: normalizeRelativePath(srcPath, ""),
    accessibleRole: jsDocInfo.accessibleRole,
    developmentStatus: jsDocInfo.status || "to-be-defined",
    formAssociated: formAssociated || undefined,
    mode,
    shadow,
    properties: properties.length > 0 ? properties : undefined,
    events: events.length > 0 ? events : undefined,
    methods: methods.length > 0 ? methods : undefined,
    parts: jsDocInfo.parts.length > 0 ? jsDocInfo.parts : undefined,
    slots: jsDocInfo.slots.length > 0 ? jsDocInfo.slots : undefined,
    cssVariables:
      jsDocInfo.cssVariables.length > 0 ? jsDocInfo.cssVariables : undefined,
    propertyImportTypes:
      Object.keys(propertyImportTypes).length > 0
        ? propertyImportTypes
        : undefined,
    eventImportTypes:
      Object.keys(eventImportTypes).length > 0 ? eventImportTypes : undefined,
    methodImportTypes:
      Object.keys(methodImportTypes).length > 0 ? methodImportTypes : undefined
  };
}

/**
 * Extract import analysis from source file
 */
function extractImportAnalysis(
  sourceFile: ts.SourceFile,
  srcPath: string,
  searchPath: string
): ImportAnalysisCache {
  // Check cache first
  const cacheKey = `${searchPath}:${srcPath}`;
  const cached = importAnalysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const importsByModule = new Map<string, ImportInfo>();
  const typeUsageMap = new Map<string, string>();

  // Get the absolute path of the current file
  const currentFilePath = path.resolve(searchPath, srcPath);

  // Extract import declarations
  sourceFile.statements.forEach(statement => {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      const moduleSpecifier = (statement.moduleSpecifier as ts.StringLiteral)
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
          if (ts.isNamespaceImport(statement.importClause.namedBindings)) {
            // namespace import (import * as foo from 'bar')
            importInfo.namespaceImport =
              statement.importClause.namedBindings.name.text;
            typeUsageMap.set(
              statement.importClause.namedBindings.name.text,
              resolvedModulePath
            );
          } else if (ts.isNamedImports(statement.importClause.namedBindings)) {
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

  const analysis: ImportAnalysisCache = {
    importsByModule,
    typeUsageMap
  };

  importAnalysisCache.set(cacheKey, analysis);
  return analysis;
}

/**
 * Extract types used in a TypeScript type annotation
 */
function extractTypesFromTypeNode(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile
): Set<string> {
  const types = new Set<string>();

  function visitTypeNode(node: ts.Node): void {
    if (ts.isTypeReferenceNode(node)) {
      if (ts.isIdentifier(node.typeName)) {
        types.add(node.typeName.text);
      } else if (ts.isQualifiedName(node.typeName)) {
        // Handle qualified names like Namespace.Type
        const fullName = sourceFile.text
          .substring(node.typeName.pos, node.typeName.end)
          .trim();
        types.add(fullName);
      }
    } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
      node.types.forEach(visitTypeNode);
    } else if (ts.isArrayTypeNode(node)) {
      visitTypeNode(node.elementType);
    } else if (ts.isTupleTypeNode(node)) {
      node.elements.forEach(visitTypeNode);
    } else if (ts.isMappedTypeNode(node)) {
      if (node.type) {
        visitTypeNode(node.type);
      }
    } else if (ts.isConditionalTypeNode(node)) {
      visitTypeNode(node.checkType);
      visitTypeNode(node.extendsType);
      visitTypeNode(node.trueType);
      visitTypeNode(node.falseType);
    }

    ts.forEachChild(node, visitTypeNode);
  }

  visitTypeNode(typeNode);
  return types;
}

/**
 * Extract types from a type string
 */
function extractTypesFromTypeString(typeString: string): Set<string> {
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
    "Extract"
  ]);

  return builtInTypes.has(typeName) || builtInTypes.has(typeName.split(".")[0]);
}

/**
 * Extract import types needed for properties
 */
function extractImportTypesForProperties(
  properties: ComponentDefinitionProperty[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes {
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
}

/**
 * Extract import types needed for events
 */
function extractImportTypesForEvents(
  events: ComponentDefinitionEvent[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes {
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
}

/**
 * Extract import types needed for methods
 */
function extractImportTypesForMethods(
  methods: ComponentDefinitionMethod[],
  importAnalysis: ImportAnalysisCache
): ComponentImportTypes {
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
}

/**
 * Find Lit component files in the specified directory
 */
async function findLitComponents(pattern: string): Promise<string[]> {
  const files = (
    await fs.readdir(pattern, {
      recursive: true,
      withFileTypes: true
    })
  )
    .filter(file => file.isFile() && file.name.endsWith(".lit.ts"))
    .map(file => path.join(file.parentPath ?? file.path, file.name))
    .sort((a, b) => (a <= b ? -1 : 0));

  return files;
}

/**
 * Extract decorator configuration from @Component decorator
 */
function extractDecoratorConfig(decorator: ts.Decorator) {
  const config: Record<string, unknown> = {};

  if (
    ts.isCallExpression(decorator.expression) &&
    decorator.expression.arguments.length > 0
  ) {
    const arg = decorator.expression.arguments[0];
    if (ts.isObjectLiteralExpression(arg)) {
      arg.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          const key = prop.name.text;
          config[key] = extractLiteralValue(prop.initializer);
        }
      });
    }
  }

  return config;
}

/**
 * Extract JSDoc information from class declaration
 */
function extractJSDocInfo(classDeclaration: ts.ClassDeclaration) {
  const jsDocTags = ts.getJSDocTags(classDeclaration);
  const jsDocComments = ts.getJSDocCommentsAndTags(classDeclaration);

  let description = "";
  let status: ComponentDefinition["developmentStatus"] = "to-be-defined";
  let accessibleRole: string | string[] | undefined;
  const parts: ComponentDefinitionPart[] = [];
  const slots: ComponentDefinitionSlot[] = [];
  const cssVariables: ComponentDefinitionCssVariable[] = [];

  // Extract main description
  const mainComment = jsDocComments.find(
    comment => ts.isJSDoc(comment) && comment.comment
  ) as ts.JSDoc | undefined;

  if (mainComment?.comment) {
    description =
      typeof mainComment.comment === "string"
        ? mainComment.comment
        : mainComment.comment.map(part => part.text || "").join("");
  }

  // Extract tags
  jsDocTags.forEach(tag => {
    const tagName = tag.tagName.text;
    const comment = tag.comment;
    const commentText =
      typeof comment === "string"
        ? comment
        : comment?.map(part => part.text || "").join("") || "";

    switch (tagName) {
      case "status":
        if (
          [
            "experimental",
            "developer-preview",
            "stable",
            "to-be-defined"
          ].includes(commentText)
        ) {
          status = commentText as ComponentDefinition["developmentStatus"];
        }
        break;
      case "accessibleRole":
        accessibleRole = commentText.includes("|")
          ? commentText.split("|").map(role => role.trim())
          : commentText.trim();
        break;
      case "part": {
        const partMatch = commentText.match(/^(\S+)\s*-\s*(.+)$/);
        if (partMatch) {
          parts.push({
            name: partMatch[1],
            description: partMatch[2].trim()
          });
        } else {
          parts.push({ name: commentText.trim() });
        }
        break;
      }
      case "slot": {
        const slotMatch = commentText.match(/^(\S+)\s*-\s*(.+)$/);
        if (slotMatch) {
          slots.push({
            name: slotMatch[1],
            description: slotMatch[2].trim()
          });
        } else {
          slots.push({ name: commentText.trim() });
        }
        break;
      }
      case "cssprop": {
        const cssMatch = commentText.match(
          /^\[([^\]]+)\](?:\s*=\s*(.+?))?\s*-\s*(.+)$/
        );
        if (cssMatch) {
          cssVariables.push({
            name: cssMatch[1],
            default: cssMatch[2]?.trim(),
            description: cssMatch[3].trim()
          });
        }
        break;
      }
    }
  });

  return {
    description: description.trim(),
    status,
    accessibleRole,
    parts,
    slots,
    cssVariables
  };
}

/**
 * Extract all class members (properties, events, methods) in a single pass for performance
 */
function extractClassMembers(
  classDeclaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  importAnalysis: ImportAnalysisCache
): [
  ComponentDefinitionProperty[],
  ComponentDefinitionEvent[],
  ComponentDefinitionMethod[]
] {
  const properties: ComponentDefinitionProperty[] = [];
  const events: ComponentDefinitionEvent[] = [];
  const methods: ComponentDefinitionMethod[] = [];

  classDeclaration.members.forEach(member => {
    // Check for @property decorator
    const propertyDecorator = member.modifiers?.find(
      (mod): mod is ts.Decorator =>
        ts.isDecorator(mod) &&
        ts.isCallExpression(mod.expression) &&
        ts.isIdentifier(mod.expression.expression) &&
        mod.expression.expression.text === "property"
    );

    // Check for @Event decorator
    const eventDecorator = member.modifiers?.find(
      (mod): mod is ts.Decorator =>
        ts.isDecorator(mod) &&
        ts.isCallExpression(mod.expression) &&
        ts.isIdentifier(mod.expression.expression) &&
        mod.expression.expression.text === "Event"
    );

    // Check for @Watch decorator
    const watchDecorator = member.modifiers?.find(
      (mod): mod is ts.Decorator =>
        ts.isDecorator(mod) &&
        ts.isCallExpression(mod.expression) &&
        ts.isIdentifier(mod.expression.expression) &&
        mod.expression.expression.text === "Watch"
    );

    if (
      propertyDecorator &&
      ts.isPropertyDeclaration(member) &&
      ts.isIdentifier(member.name)
    ) {
      const property = extractProperty(member, propertyDecorator, sourceFile);
      if (property) {
        properties.push(property);
      }
    } else if (
      eventDecorator &&
      ts.isPropertyDeclaration(member) &&
      ts.isIdentifier(member.name)
    ) {
      const event = extractEvent(member, sourceFile);
      if (event) {
        events.push(event);
      }
    } else if (
      (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
      ts.isIdentifier(member.name) &&
      !propertyDecorator &&
      !eventDecorator &&
      !watchDecorator && // Exclude @Watch decorated methods
      isPublicMethod(member)
    ) {
      const method = extractMethod(member, sourceFile);
      if (method) {
        methods.push(method);
      }
    }
  });

  return [properties, events, methods];
}

/**
 * Check if a method is public (not a Lit lifecycle method, private, protected, or decorated)
 */
function isPublicMethod(member: ts.ClassElement): boolean {
  if (!ts.isIdentifier(member.name)) {
    return false;
  }

  const methodName = member.name.text;

  // Exclude Lit lifecycle methods
  if (LIT_LIFECYCLE_METHODS.has(methodName)) {
    return false;
  }

  // Exclude private methods (starting with # or _)
  if (methodName.startsWith("#") || methodName.startsWith("_")) {
    return false;
  }

  // Check for access modifiers
  if (member.modifiers) {
    const hasPrivateModifier = member.modifiers.some(
      mod => mod.kind === ts.SyntaxKind.PrivateKeyword
    );
    const hasProtectedModifier = member.modifiers.some(
      mod => mod.kind === ts.SyntaxKind.ProtectedKeyword
    );

    if (hasPrivateModifier || hasProtectedModifier) {
      return false;
    }
  }

  return true;
}

/**
 * Extract property information
 */
function extractProperty(
  member: ts.PropertyDeclaration,
  decorator: ts.Decorator,
  sourceFile: ts.SourceFile
): ComponentDefinitionProperty | null {
  if (!ts.isIdentifier(member.name)) {
    return null;
  }

  const propertyName = member.name.text;
  const decoratorConfig = extractDecoratorConfig(decorator);
  const jsDoc = extractMemberJSDoc(member);

  // Extract type information
  const typeText = member.type
    ? sourceFile.text.substring(member.type.pos, member.type.end).trim()
    : "any";

  // Extract default value
  const defaultValue = member.initializer
    ? sourceFile.text
        .substring(member.initializer.pos, member.initializer.end)
        .trim()
    : "undefined";

  // Determine attribute name
  let attribute: string | false = false;
  if (decoratorConfig.attribute !== false) {
    attribute = decoratorConfig.attribute || propertyName.toLowerCase();
  }

  return {
    name: propertyName,
    attribute,
    type: typeText,
    default: defaultValue,
    description: jsDoc.description,
    reflect: decoratorConfig.reflect || undefined,
    required: jsDoc.required || undefined
  };
}

/**
 * Extract event information
 */
function extractEvent(
  member: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile
): ComponentDefinitionEvent | null {
  if (!ts.isIdentifier(member.name)) {
    return null;
  }

  const eventName = member.name.text;
  const jsDoc = extractMemberJSDoc(member);

  // Extract EventEmitter generic type for detail type
  let detailType = "void";
  if (member.type && ts.isTypeReferenceNode(member.type)) {
    const typeArgs = member.type.typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      detailType = sourceFile.text
        .substring(typeArgs[0].pos, typeArgs[0].end)
        .trim();
    }
  }

  return {
    name: eventName,
    detailType,
    description: jsDoc.description
  };
}

/**
 * Extract method information
 */
function extractMethod(
  member: ts.MethodDeclaration | ts.PropertyDeclaration,
  sourceFile: ts.SourceFile
): ComponentDefinitionMethod | null {
  if (!ts.isIdentifier(member.name)) {
    return null;
  }

  let parameters: ts.ParameterDeclaration[] = [];
  let returnType = "void";

  if (ts.isMethodDeclaration(member)) {
    parameters = Array.from(member.parameters);
    returnType = member.type
      ? sourceFile.text.substring(member.type.pos, member.type.end).trim()
      : "void";
  } else if (ts.isPropertyDeclaration(member) && member.initializer) {
    // Check if it's an arrow function or function expression
    if (
      ts.isArrowFunction(member.initializer) ||
      ts.isFunctionExpression(member.initializer)
    ) {
      parameters = Array.from(member.initializer.parameters);
      returnType = member.initializer.type
        ? sourceFile.text
            .substring(member.initializer.type.pos, member.initializer.type.end)
            .trim()
        : "void";
    } else {
      return null; // Not a method
    }
  } else {
    return null;
  }

  const methodName = member.name.text;
  const jsDoc = extractMemberJSDoc(member);

  const paramTypes = parameters.map(param => {
    const paramName = ts.isIdentifier(param.name) ? param.name.text : "unknown";
    const paramType = param.type
      ? sourceFile.text.substring(param.type.pos, param.type.end).trim()
      : "any";

    return {
      name: paramName,
      type: paramType,
      description: extractParamDescription(jsDoc.rawComment, paramName)
    };
  });

  return {
    name: methodName,
    paramTypes,
    returnType,
    description: jsDoc.description
  };
}

/**
 * Extract JSDoc information from class member
 */
function extractMemberJSDoc(member: ts.ClassElement) {
  const jsDocTags = ts.getJSDocTags(member);
  const jsDocComments = ts.getJSDocCommentsAndTags(member);

  let description = "";
  let required = false;
  let rawComment = "";

  // Extract main description
  const mainComment = jsDocComments.find(
    comment => ts.isJSDoc(comment) && comment.comment
  ) as ts.JSDoc | undefined;

  if (mainComment?.comment) {
    description =
      typeof mainComment.comment === "string"
        ? mainComment.comment
        : mainComment.comment.map(part => part.text || "").join("");
    rawComment = description;
  }

  // Check for required tag
  const requiredTag = jsDocTags.find(tag => tag.tagName.text === "required");
  if (requiredTag) {
    required = true;
  }

  return {
    description: description.trim() || undefined,
    required: required || undefined,
    rawComment
  };
}

/**
 * Extract parameter description from JSDoc comment
 */
function extractParamDescription(
  rawComment: string,
  paramName: string
): string | undefined {
  const paramRegex = new RegExp(`@param\\s+${paramName}\\s+(.+?)(?=@|$)`, "s");
  const match = rawComment.match(paramRegex);
  return match?.[1]?.trim();
}

/**
 * Extract literal value from TypeScript node
 */
function extractLiteralValue(node: ts.Expression): any {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj: any = {};
    node.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        obj[prop.name.text] = extractLiteralValue(prop.initializer);
      }
    });
    return obj;
  }
  return undefined;
}

/**
 * Extract package.json exports mapping with optimized parsing
 */
async function extractPackageJsonExports(
  packageJsonPath: string
): Promise<PackageExports> {
  try {
    const packageContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageContent);

    if (!packageJson.exports || typeof packageJson.exports !== "object") {
      return {};
    }

    return packageJson.exports as PackageExports;
  } catch {
    return {};
  }
}

/**
 * Find matching export path for a component with optimized algorithm
 */
function findMatchingExportPath(
  componentDef: ComponentDefinition,
  exportsMap: PackageExports,
  relativePath: string
): string | undefined {
  // Extract component name from file path
  const fileName = path.basename(relativePath, ".lit.ts");

  // Create possible export key patterns based on the component
  const possibleKeys = [
    `./components/${fileName}.js`,
    `./components/${componentDef.tagName.replace(/^ch-/, "")}.js`,
    `./components/${componentDef.className
      .toLowerCase()
      .replace(/^ch/, "")
      .replace(/render$/, "")}.js`
  ];

  // First, try exact matches with possible keys
  for (const key of possibleKeys) {
    if (exportsMap[key]) {
      return key;
    }
  }

  // Then, search through all exports for pattern matches
  for (const [exportKey, exportValue] of Object.entries(exportsMap)) {
    if (!exportKey.startsWith("./components/")) {
      continue;
    }

    // Get the default export path for comparison
    const defaultPath = getDefaultExportPath(exportValue);
    if (!defaultPath) {
      continue;
    }

    // Extract the component path from the export value
    // Example: "./dist/browser/production/components/radio-group/radio-group-render.lit.js"
    // Should match: "src/components/radio-group/radio-group-render.lit.ts"
    const pathMatch = defaultPath.match(
      /\/components\/(.+)\/([^/]+)\.lit\.js$/
    );

    if (pathMatch) {
      const [, folderName, baseName] = pathMatch;
      const expectedSrcPath = `src/components/${folderName}/${baseName}.lit.ts`;

      if (relativePath === expectedSrcPath) {
        return exportKey;
      }
    }

    // Fallback: Check if the export key basename matches our component
    const exportBaseName = path.basename(exportKey, ".js");
    if (exportBaseName === fileName) {
      return exportKey;
    }
  }

  return undefined;
}

/**
 * Get the default export path from export condition object
 */
function getDefaultExportPath(
  exportCondition: ExportCondition
): string | undefined {
  // Priority order: default > development > browser.default > browser.development
  return (
    exportCondition.default ||
    exportCondition.development ||
    exportCondition.browser?.default ||
    exportCondition.browser?.development
  );
}
