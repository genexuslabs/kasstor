import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSourceFile,
  forEachChild,
  isArrayLiteralExpression,
  isAsExpression,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isNumericLiteral,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isPrefixUnaryExpression,
  isPropertyAssignment,
  isSatisfiesExpression,
  isStringLiteralLike,
  isVariableStatement,
  ScriptTarget,
  SyntaxKind
} from "typescript";
import type {
  ArrayLiteralExpression,
  Expression,
  Node as TsNode,
  PropertyName,
  SourceFile
} from "typescript";
import type { ComponentDefinition } from "../typings/library-components.js";

/**
 * Result of `loadLibrarySummary` describing where the data came from.
 *
 * `source` is useful for tooling that wants to surface the artifact path in
 * diagnostics (e.g. "loaded N components from <path>"). `format` records
 * which discovery branch succeeded.
 */
export interface LoadedLibrarySummary {
  components: ComponentDefinition[];
  source: string;
  format: "json" | "ts";
}

export interface LoadLibrarySummaryOptions {
  /**
   * Directory or file to load from. Resolution rules:
   *   1. If `srcPath` already points at a `.json` file → parse JSON directly.
   *   2. If `srcPath` is a directory and contains `library-summary.json`
   *      → parse that (preferred; emitted by `buildLibrary`).
   *   3. If `srcPath` is a directory and contains `library-summary.ts`
   *      → evaluate the exported array literal via the TS AST.
   * Anything else → returns `null`.
   */
  srcPath: string;

  /**
   * Hooks called for non-fatal anomalies. Failing to load a summary is
   * never a thrown error — callers always get either a valid summary or
   * `null`. Defaults log nothing.
   */
  onWarning?: (message: string) => void;
  onError?: (message: string, err?: unknown) => void;
}

/**
 * Load a Kasstor library summary from disk. The summary may be the JSON
 * artifact emitted alongside `library-summary.ts` (preferred — a single
 * sync read + `JSON.parse`) or the TS literal itself (parsed via the TS
 * compiler API).
 *
 * The function is intentionally synchronous: the artifact is at most a few
 * hundred KB and load happens on the analyzer's hot path. Wrapping the IO
 * in a promise would add a microtask hop with no benefit.
 *
 * Returns `null` on any non-fatal failure (file missing, malformed input,
 * unrecognized format). Callers can distinguish "no data" from "error" via
 * the `onWarning` / `onError` callbacks.
 */
export function loadLibrarySummary(opts: LoadLibrarySummaryOptions): LoadedLibrarySummary | null {
  const { srcPath, onWarning, onError } = opts;

  // 1. Direct JSON pointer.
  if (srcPath.endsWith(".json") && existsSync(srcPath)) {
    return readJsonSummary(srcPath, onWarning, onError);
  }

  // 2. Directory containing the JSON sibling artifact.
  const jsonAtDir = resolve(srcPath, "library-summary.json");
  if (existsSync(jsonAtDir)) {
    return readJsonSummary(jsonAtDir, onWarning, onError);
  }

  // 3. Directory containing the TS source. Older kasstor-build versions
  //    only emitted the TS form; we keep the parser as a compatibility
  //    fallback so the analyzer works against historical builds.
  const tsAtDir = resolve(srcPath, "library-summary.ts");
  if (existsSync(tsAtDir)) {
    return readTsSummary(tsAtDir, onWarning, onError);
  }

  return null;
}

// -----------------------------------------------------------------------------
// JSON path
// -----------------------------------------------------------------------------

function readJsonSummary(
  filePath: string,
  onWarning: ((m: string) => void) | undefined,
  onError: ((m: string, e?: unknown) => void) | undefined
): LoadedLibrarySummary | null {
  try {
    const data: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(data)) {
      onWarning?.(`[kasstor-build] ${filePath} did not contain a top-level array; ignoring.`);
      return null;
    }
    return {
      components: data as ComponentDefinition[],
      source: filePath,
      format: "json"
    };
  } catch (err) {
    onError?.(`[kasstor-build] failed to parse ${filePath}`, err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// TS-literal path (fallback for kasstor-build < 0.2.0 emit format)
// -----------------------------------------------------------------------------

function readTsSummary(
  filePath: string,
  onWarning: ((m: string) => void) | undefined,
  onError: ((m: string, e?: unknown) => void) | undefined
): LoadedLibrarySummary | null {
  try {
    const text = readFileSync(filePath, "utf8");
    const sf = createSourceFile(filePath, text, ScriptTarget.Latest, /* setParentNodes */ true);

    const arrayLiteral = findFirstExportedArrayLiteral(sf);
    if (!arrayLiteral) {
      onWarning?.(`[kasstor-build] ${filePath} has no exported array literal; ignoring.`);
      return null;
    }

    const value = evalLiteral(arrayLiteral);
    if (!Array.isArray(value)) {
      onWarning?.(`[kasstor-build] ${filePath} top-level export is not an array; ignoring.`);
      return null;
    }
    return {
      components: value as ComponentDefinition[],
      source: filePath,
      format: "ts"
    };
  } catch (err) {
    onError?.(`[kasstor-build] failed to parse ${filePath}`, err);
    return null;
  }
}

function findFirstExportedArrayLiteral(sf: SourceFile): ArrayLiteralExpression | undefined {
  let result: ArrayLiteralExpression | undefined;
  function visit(node: TsNode): void {
    if (result) return;
    if (
      isVariableStatement(node) &&
      node.modifiers?.some(m => m.kind === SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (decl.initializer) {
          const init = stripWrappingExpressions(decl.initializer);
          if (isArrayLiteralExpression(init)) {
            result = init;
            return;
          }
        }
      }
    }
    forEachChild(node, visit);
  }
  visit(sf);
  return result;
}

function stripWrappingExpressions(node: Expression): Expression {
  let cur: Expression = node;
  while (
    isAsExpression(cur) ||
    isParenthesizedExpression(cur) ||
    isSatisfiesExpression(cur)
  ) {
    cur = cur.expression;
  }
  return cur;
}

/**
 * Evaluate a TS literal AST node as JSON-compatible data. Anything not
 * representable as JSON (call expressions, identifier references, template
 * literals with substitutions) collapses to `null` for that node — the
 * library-summary format is JSON-shaped by construction, so this is a
 * lossless evaluator for valid input and a graceful degradation for noise.
 */
function evalLiteral(node: TsNode): unknown {
  if (isStringLiteralLike(node) || isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === SyntaxKind.TrueKeyword) return true;
  if (node.kind === SyntaxKind.FalseKeyword) return false;
  if (node.kind === SyntaxKind.NullKeyword) return null;
  if (isArrayLiteralExpression(node)) {
    return node.elements.map(evalLiteral);
  }
  if (isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (isPropertyAssignment(prop)) {
        const key = propertyName(prop.name);
        if (key != null) obj[key] = evalLiteral(prop.initializer);
      }
    }
    return obj;
  }
  if (isAsExpression(node) || isParenthesizedExpression(node) || isSatisfiesExpression(node)) {
    return evalLiteral(node.expression);
  }
  if (isPrefixUnaryExpression(node) && isNumericLiteral(node.operand)) {
    const sign = node.operator === SyntaxKind.MinusToken ? -1 : 1;
    return sign * Number(node.operand.text);
  }
  return null;
}

function propertyName(name: PropertyName): string | undefined {
  if (isIdentifier(name)) return name.text;
  if (isStringLiteralLike(name) || isNoSubstitutionTemplateLiteral(name)) return name.text;
  return undefined;
}
