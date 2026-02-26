import type { Decorator, Expression } from "typescript";
import {
  isCallExpression,
  isIdentifier,
  isNumericLiteral,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  SyntaxKind
} from "typescript";

/**
 * Extract literal value from TypeScript node
 */
const extractLiteralValue = (node: Expression): unknown => {
  if (isStringLiteral(node)) {
    return node.text;
  }
  if (isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === SyntaxKind.FalseKeyword) {
    return false;
  }
  if (isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {};
    node.properties.forEach(prop => {
      if (isPropertyAssignment(prop) && isIdentifier(prop.name)) {
        obj[prop.name.text] = extractLiteralValue(prop.initializer);
      }
    });
    return obj;
  }
  return undefined;
};

/**
 * Extract decorator configuration from @Component decorator
 */
export const extractDecoratorConfig = (
  decorator: Decorator
): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  if (
    isCallExpression(decorator.expression) &&
    decorator.expression.arguments.length > 0
  ) {
    const arg = decorator.expression.arguments[0];
    if (isObjectLiteralExpression(arg)) {
      arg.properties.forEach(prop => {
        if (isPropertyAssignment(prop) && isIdentifier(prop.name)) {
          const key = prop.name.text;
          config[key] = extractLiteralValue(prop.initializer);
        }
      });
    }
  }

  return config;
};

