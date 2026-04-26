import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
import type { ComponentDefinition } from "@genexus/kasstor-build";
import { convertKasstorSummaryToCem } from "../parse/parse-kasstor-summary.js";
import type {
  ExternalManifestSource,
  ExternalManifestSourceContext,
  ResolvedManifest
} from "./external-manifest-source.js";
import { PackageRootIndex } from "./package-root-index.js";

const KASSTOR_SUMMARY_MARKER = "<kasstor-summary>";

/**
 * Resolves the Kasstor library summary for a project and exposes it as a CEM
 * `ResolvedManifest`.
 *
 * Loading strategy (first match wins):
 *   1. `{ srcPath }` pointing at a `.json` file → JSON parse.
 *   2. `<srcPath>/library-summary.json` (kasstor-build ≥ 0.2.0).
 *   3. `<srcPath>/library-summary.ts` (older emit format, parsed via TS AST).
 *
 * Failures degrade to "no manifest" with a warning, never a thrown error.
 *
 * Why the loader lives here AND in `@genexus/kasstor-build`:
 * `kasstor-build` is an ESM-only package (`"type": "module"`) and the
 * analyzer is CJS-compiled (the TS compiler plugin loader requires
 * `module.exports = require(...).init`). Static `require()` of an
 * ESM-only package is not supported by Node's CJS loader, and a dynamic
 * `import()` cannot be awaited inside the analyzer's synchronous
 * `findInvalidatedComponents` path. Maintaining a small parallel copy of
 * the loader (this file) keeps the analyzer hot path sync while
 * `kasstor-build` exposes the canonical implementation for ESM consumers.
 * The two implementations share the `ComponentDefinition` type, so the
 * shape contract has a single source of truth.
 */
export class KasstorSummarySource implements ExternalManifestSource {
  readonly name = "kasstor-summary";

  private manifests: ResolvedManifest[] = [];
  private readonly index = new PackageRootIndex();

  constructor(private readonly mode: "auto" | { srcPath: string }) {}

  load(ctx: ExternalManifestSourceContext): readonly ResolvedManifest[] {
    const srcPath = this.resolveSrcPath(ctx);
    if (srcPath == null) return [];

    const summary = this.tryLoadSummary(srcPath, ctx);
    if (summary == null) return [];

    const manifest = convertKasstorSummaryToCem(summary);
    const packageRoot = this.findPackageRoot(srcPath);

    const resolved: ResolvedManifest = {
      sourceName: KASSTOR_SUMMARY_MARKER,
      packageRoot,
      manifest
    };

    this.manifests = [resolved];
    this.index.clear();
    this.index.add(packageRoot, KASSTOR_SUMMARY_MARKER);
    return this.manifests;
  }

  coversSourceFile(sourceFile: SourceFile): string | undefined {
    return this.index.cover(sourceFile);
  }

  private resolveSrcPath(ctx: ExternalManifestSourceContext): string | null {
    if (this.mode === "auto") {
      const candidate = resolve(ctx.programRoot, "src");
      return existsSync(candidate) ? candidate : null;
    }
    return resolve(ctx.programRoot, this.mode.srcPath);
  }

  private tryLoadSummary(
    srcPath: string,
    ctx: ExternalManifestSourceContext
  ): ComponentDefinition[] | null {
    if (srcPath.endsWith(".json") && existsSync(srcPath)) {
      return parseJsonSummary(srcPath, ctx);
    }
    const jsonAtSrc = resolve(srcPath, "library-summary.json");
    if (existsSync(jsonAtSrc)) {
      return parseJsonSummary(jsonAtSrc, ctx);
    }
    const tsAtSrc = resolve(srcPath, "library-summary.ts");
    if (existsSync(tsAtSrc)) {
      return parseTsLiteralSummary(tsAtSrc, ctx);
    }
    return null;
  }

  private findPackageRoot(srcPath: string): string {
    let dir = resolve(srcPath);
    while (true) {
      if (existsSync(resolve(dir, "package.json"))) return dir;
      const parent = resolve(dir, "..");
      if (parent === dir) return dirname(srcPath);
      dir = parent;
    }
  }

  getLoadedManifests(): readonly ResolvedManifest[] {
    return this.manifests;
  }
}

// -----------------------------------------------------------------------------
// File parsers — duplicated from `@genexus/kasstor-build/library-summary/load-library-summary.ts`
// for the CJS/ESM reasons documented on the class.
// Keep the two files in sync when changing the loader contract.
// -----------------------------------------------------------------------------

function parseJsonSummary(
  filePath: string,
  ctx: ExternalManifestSourceContext
): ComponentDefinition[] | null {
  try {
    const data: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (Array.isArray(data)) return data as ComponentDefinition[];
    ctx.logger.warn(`[kasstor-summary] ${filePath} did not contain a top-level array; ignoring.`);
    return null;
  } catch (err) {
    ctx.logger.error(`[kasstor-summary] failed to parse ${filePath}`, err);
    return null;
  }
}

function parseTsLiteralSummary(
  filePath: string,
  ctx: ExternalManifestSourceContext
): ComponentDefinition[] | null {
  try {
    const text = readFileSync(filePath, "utf8");
    const sf = createSourceFile(
      filePath,
      text,
      ScriptTarget.Latest,
      /* setParentNodes */ true
    );

    const arrayLiteral = findFirstArrayLiteralExport(sf);
    if (!arrayLiteral) {
      ctx.logger.warn(`[kasstor-summary] ${filePath} has no exported array literal; ignoring.`);
      return null;
    }

    const value = evalLiteral(arrayLiteral);
    if (!Array.isArray(value)) {
      ctx.logger.warn(`[kasstor-summary] ${filePath} top-level export is not an array; ignoring.`);
      return null;
    }
    return value as ComponentDefinition[];
  } catch (err) {
    ctx.logger.error(`[kasstor-summary] failed to parse ${filePath}`, err);
    return null;
  }
}

function findFirstArrayLiteralExport(
  sf: SourceFile
): ArrayLiteralExpression | undefined {
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
  if (
    isAsExpression(node) ||
    isParenthesizedExpression(node) ||
    isSatisfiesExpression(node)
  ) {
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
  if (isStringLiteralLike(name) || isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return undefined;
}
