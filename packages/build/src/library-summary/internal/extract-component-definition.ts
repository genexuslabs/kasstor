import type { CallExpression, ClassDeclaration, Decorator, Identifier, Node, SourceFile } from "typescript";
import { createSourceFile, isCallExpression, isClassDeclaration, isDecorator, isIdentifier, ScriptKind, ScriptTarget } from "typescript";

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

const getComponentAndClassDecoratorFromNode = (
  node: Node,
  decoratorNames: string[]
) => {
  if (isClassDeclaration(node) && node.modifiers) {
    const decorator = node.modifiers.find((mod): mod is Decorator => {
      if (!isDecorator(mod) || !isCallExpression(mod.expression)) {
        return false;
      }
      const callExpr = mod.expression as CallExpression;
      if (!isIdentifier(callExpr.expression)) {
        return false;
      }
      const identExpr = callExpr.expression as Identifier;
      return decoratorNames.some(name => identExpr.text.endsWith(name));
    });

    if (decorator) {
      return {
        componentClass: node,
        componentDecorator: decorator
      };
    }
  }

  return null;
};

const findComponentClass = (
  node: Node,
  decoratorNames: string[]
): {
  componentClass: ClassDeclaration;
  componentDecorator: Decorator;
} | null => {
  let result = getComponentAndClassDecoratorFromNode(node, decoratorNames);

  if (result) {
    return result;
  }

  node.forEachChild(node => {
    if (result === null) {
      result = findComponentClass(node, decoratorNames);
    }
  });

  return result;
};

export const getComponentClassAndDecorator = (
  sourceFile: SourceFile,
  customComponentDecoratorNames: string[] | undefined
): {
  componentClass: ClassDeclaration | null;
  componentDecorator: Decorator | null;
} => {
  const decoratorNames =
    !customComponentDecoratorNames || customComponentDecoratorNames.length === 0
      ? ["Component"]
      : customComponentDecoratorNames;

  // Find the component class and its @Component decorator
  const result = findComponentClass(sourceFile, decoratorNames);

  if (result) {
    return {
      componentClass: result.componentClass,
      componentDecorator: result.componentDecorator
    };
  }
  return {
    componentClass: null,
    componentDecorator: null
  };
};

export const getTsSourceFile = (srcPath: string, fileContent: string) =>
  createSourceFile(
    srcPath,
    fileContent,
    ScriptTarget.ES2022,
    true,
    ScriptKind.TS
  );

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
  sourceFile: SourceFile;
  classDeclaration: ClassDeclaration;
} | null> => {
  const sourceFile = getTsSourceFile(srcPath, fileContent);

  // Extract import information
  const importAnalysis = extractImportAnalysis(sourceFile, searchPath, srcPath);

  const { componentClass, componentDecorator } = getComponentClassAndDecorator(
    sourceFile,
    customComponentDecoratorNames
  );

  if (!componentClass || !componentDecorator) {
    return null;
  }

  const classNameNode = componentClass.name;
  if (!classNameNode || !isIdentifier(classNameNode)) {
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

