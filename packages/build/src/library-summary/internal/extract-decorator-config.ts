import * as ts from "typescript";

/**
 * Extract literal value from TypeScript node
 */
const extractLiteralValue = (node: ts.Expression): unknown => {
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
    const obj: Record<string, unknown> = {};
    node.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
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
  decorator: ts.Decorator
): Record<string, unknown> => {
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
};

