import type { ClassDeclaration, Decorator, MethodDeclaration, ModifierLike, ParameterDeclaration, PropertyDeclaration, SourceFile } from "typescript";
import {
  isArrowFunction,
  isCallExpression,
  isDecorator,
  isFunctionExpression,
  isIdentifier,
  isMethodDeclaration,
  isPropertyDeclaration,
  isTypeReferenceNode,
  SyntaxKind
} from "typescript";

import type {
  ComponentDefinitionEvent,
  ComponentDefinitionMethod,
  ComponentDefinitionProperty
} from "../../typings/library-components";
import { extractDecoratorConfig } from "./extract-decorator-config.js";
import {
  extractMemberJSDoc,
  extractParamDescription
} from "./extract-jsdoc-info.js";

/**
 * Lit lifecycle methods that should be excluded from public API
 */
const LIT_LIFECYCLE_METHODS = new Set([
  "connectedCallback",
  "disconnectedCallback",
  "adoptedCallback",
  "attributeChangedCallback",
  "requestUpdate",
  "performUpdate",
  "shouldUpdate",
  "firstWillUpdate",
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

/**
 * Check if a method is public (not a Lit lifecycle method, private, protected, or decorated)
 */
const isPublicMethod = (
  member: MethodDeclaration | PropertyDeclaration
): boolean => {
  if (!isIdentifier(member.name)) {
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
      (mod: ModifierLike) => mod.kind === SyntaxKind.PrivateKeyword
    );
    const hasProtectedModifier = member.modifiers.some(
      (mod: ModifierLike) => mod.kind === SyntaxKind.ProtectedKeyword
    );

    if (hasPrivateModifier || hasProtectedModifier) {
      return false;
    }
  }

  return true;
};

/**
 * Extract property information
 */
const extractProperty = (
  member: PropertyDeclaration,
  decorator: Decorator,
  sourceFile: SourceFile
): ComponentDefinitionProperty | null => {
  if (!isIdentifier(member.name)) {
    return null;
  }

  const propertyName = member.name.text;
  const decoratorConfig = extractDecoratorConfig(decorator);
  const jsDoc = extractMemberJSDoc(member);

  // Extract type information
  const typeText = member.type
    ? sourceFile.text.substring(member.type.pos, member.type.end)
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
    attribute =
      (decoratorConfig.attribute as string | undefined) ||
      propertyName.toLowerCase();
  }

  return {
    name: propertyName,
    attribute,
    type: typeText,
    default: defaultValue,
    description: jsDoc.description,
    reflect:
      typeof decoratorConfig.reflect === "boolean"
        ? decoratorConfig.reflect
        : undefined,
    required: jsDoc.required || undefined
  };
};

/**
 * Extract event information
 */
const extractEvent = (
  member: PropertyDeclaration,
  sourceFile: SourceFile
): ComponentDefinitionEvent | null => {
  if (!isIdentifier(member.name)) {
    return null;
  }

  const eventName = member.name.text;
  const jsDoc = extractMemberJSDoc(member);

  // Extract EventEmitter generic type for detail type
  let detailType = "void";
  if (member.type && isTypeReferenceNode(member.type)) {
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
};

/**
 * Extract method information
 */
const extractMethod = (
  member: MethodDeclaration | PropertyDeclaration,
  sourceFile: SourceFile
): ComponentDefinitionMethod | null => {
  if (!isIdentifier(member.name)) {
    return null;
  }

  let parameters: ParameterDeclaration[] = [];
  let returnType = "void";

  if (isMethodDeclaration(member)) {
    parameters = Array.from(member.parameters);
    returnType = member.type
      ? sourceFile.text.substring(member.type.pos, member.type.end).trim()
      : "void";
  } else if (isPropertyDeclaration(member) && member.initializer) {
    // Check if it's an arrow function or function expression
    if (
      isArrowFunction(member.initializer) ||
      isFunctionExpression(member.initializer)
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
    const paramName = isIdentifier(param.name) ? param.name.text : "unknown";
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
};

/**
 * Extract all class members (properties, events, methods) in a single pass for performance
 */
export const extractClassMembers = (
  classDeclaration: ClassDeclaration,
  sourceFile: SourceFile
): [
  ComponentDefinitionProperty[],
  ComponentDefinitionEvent[],
  ComponentDefinitionMethod[]
] => {
  const properties: ComponentDefinitionProperty[] = [];
  const events: ComponentDefinitionEvent[] = [];
  const methods: ComponentDefinitionMethod[] = [];

  classDeclaration.members.forEach(member => {
    // Get modifiers safely
    const modifiers = (member as PropertyDeclaration | MethodDeclaration)
      .modifiers;

    // Check for @property or @prop decorators
    const propertyDecorator = modifiers?.find(
      (mod): mod is Decorator =>
        isDecorator(mod) &&
        isCallExpression(mod.expression) &&
        isIdentifier(mod.expression.expression) &&
        (mod.expression.expression.text === "property" ||
          mod.expression.expression.text === "Prop")
    );

    // Check for @Event decorator
    const eventDecorator = modifiers?.find(
      (mod): mod is Decorator =>
        isDecorator(mod) &&
        isCallExpression(mod.expression) &&
        isIdentifier(mod.expression.expression) &&
        mod.expression.expression.text === "Event"
    );

    // Check for @Observe or @Watch decorators
    const watchDecorator = modifiers?.find(
      (mod): mod is Decorator =>
        isDecorator(mod) &&
        isCallExpression(mod.expression) &&
        isIdentifier(mod.expression.expression) &&
        (mod.expression.expression.text === "Observe" ||
          mod.expression.expression.text === "Watch")
    );

    if (
      propertyDecorator &&
      isPropertyDeclaration(member) &&
      isIdentifier(member.name)
    ) {
      const property = extractProperty(member, propertyDecorator, sourceFile);
      if (property) {
        properties.push(property);
      }
    } else if (
      eventDecorator &&
      isPropertyDeclaration(member) &&
      isIdentifier(member.name)
    ) {
      const event = extractEvent(member, sourceFile);
      if (event) {
        events.push(event);
      }
    } else if (
      (isMethodDeclaration(member) || isPropertyDeclaration(member)) &&
      isIdentifier(member.name) &&
      !propertyDecorator &&
      !eventDecorator &&
      !watchDecorator && // Exclude @Observe decorated methods
      isPublicMethod(member)
    ) {
      const method = extractMethod(member, sourceFile);
      if (method) {
        methods.push(method);
      }
    }
  });

  return [properties, events, methods];
};
