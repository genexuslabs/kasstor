import * as ts from "typescript";

import type { ComponentDefinition } from "../../typings/library-components";
import { extractClassMembers } from "./extract-class-members.js";
import { extractDecoratorConfig } from "./extract-decorator-config.js";
import { extractImportAnalysis } from "./extract-import-analysis.js";
import {
  extractImportTypesForEvents,
  extractImportTypesForMethods,
  extractImportTypesForProperties
} from "./extract-import-types.js";
import { extractJSDocInfo } from "./extract-jsdoc-info.js";
import { normalizeRelativePath } from "./normalize-path.js";

/**
 * Extract component definition from file content
 * Returns both the component definition and the source file/class for validation
 */
export const extractComponentDefinition = async (
  fileContent: string,
  srcPath: string,
  searchPath: string,
  defaultComponentAccess: ComponentDefinition["access"],
  customComponentDecoratorNames: string[] | undefined
): Promise<{
  component: ComponentDefinition;
  sourceFile: ts.SourceFile;
  classDeclaration: ts.ClassDeclaration;
} | null> => {
  const sourceFile = ts.createSourceFile(
    srcPath,
    fileContent,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );

  // Extract import information
  const importAnalysis = extractImportAnalysis(sourceFile, searchPath, srcPath);

  let componentClass: ts.ClassDeclaration | null = null;
  let componentDecorator: ts.Decorator | null = null;

  // Find the component class and its @Component decorator
  const findComponentClass = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.modifiers) {
      const decoratorNames = customComponentDecoratorNames || ["Component"];
      const decorator = node.modifiers.find((mod): mod is ts.Decorator => {
        if (!ts.isDecorator(mod)) {
          return false;
        }
        if (!ts.isCallExpression(mod.expression)) {
          return false;
        }
        const callExpr = mod.expression as ts.CallExpression;
        if (!ts.isIdentifier(callExpr.expression)) {
          return false;
        }
        const identExpr = callExpr.expression as ts.Identifier;
        return decoratorNames.some(name => identExpr.text.endsWith(name));
      });

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

  const classNameNode = (componentClass as ts.ClassDeclaration).name;
  if (!classNameNode || !ts.isIdentifier(classNameNode)) {
    return null;
  }

  const className = classNameNode.text;

  // Extract component metadata
  const decoratorConfig = extractDecoratorConfig(componentDecorator);
  const jsDocInfo = extractJSDocInfo(componentClass, sourceFile);

  const tagName = (decoratorConfig.tag as string) || "";

  // Shadow is true by default in the decorator
  const shadow = decoratorConfig.shadow !== false;
  const shadowConfig = decoratorConfig.shadow as
    | Record<string, unknown>
    | undefined;
  const modeValue = (shadowConfig?.mode as string) || "open";
  const mode: "open" | "closed" = modeValue === "closed" ? "closed" : "open";
  const formAssociated = (shadowConfig?.formAssociated as boolean) || false;

  // Extract properties, events, methods from class
  const [properties, events, methods] = extractClassMembers(
    componentClass,
    sourceFile
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

  const component: ComponentDefinition = {
    access: jsDocInfo.access ?? defaultComponentAccess,
    tagName,
    className,
    description: jsDocInfo.description || "",
    fullClassJSDoc: jsDocInfo.fullClassJSDoc,
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

  return {
    component,
    sourceFile,
    classDeclaration: componentClass
  };
};

