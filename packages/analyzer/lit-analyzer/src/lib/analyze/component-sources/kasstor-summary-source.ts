import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as tsModule from "typescript";
import type { SourceFile } from "typescript";
import type { ComponentDefinition } from "@genexus/kasstor-build";
import { convertKasstorSummaryToCem } from "../parse/parse-kasstor-summary.js";
import type { ExternalManifestSource, ExternalManifestSourceContext, ResolvedManifest } from "./external-manifest-source.js";
import { PackageRootIndex } from "./package-root-index.js";

const KASSTOR_SUMMARY_MARKER = "<kasstor-summary>";

/**
 * Resolves the Kasstor library summary for a project and exposes it as a CEM
 * `ResolvedManifest`.
 *
 * Loading strategy (first match wins):
 *
 *  1. If `mode` is `{ srcPath }` and the path ends in `.json`, the JSON is
 *     parsed directly. Useful for tests and explicit overrides.
 *  2. `<srcPath>/library-summary.json` — emitted by `@genexus/kasstor-build`
 *     since 0.2.0 alongside the TS artifact. This is the preferred path: a
 *     single sync read + `JSON.parse`, zero TS parsing.
 *  3. `<srcPath>/library-summary.ts` — emitted by `@genexus/kasstor-build`
 *     for TS consumers. We use the TS API to walk the exported array literal
 *     and evaluate it as JSON-compatible data. Strictly a fallback for
 *     projects on a kasstor-build version that pre-dates the JSON emit.
 *
 * Failures degrade to "no manifest" with a warning, never a thrown error.
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

	private tryLoadSummary(srcPath: string, ctx: ExternalManifestSourceContext): ComponentDefinition[] | null {
		// 1. Caller pointed `srcPath` directly at a JSON file.
		if (srcPath.endsWith(".json") && existsSync(srcPath)) {
			return parseJsonSummary(srcPath, ctx);
		}

		// 2. Preferred: `<srcPath>/library-summary.json` (emitted by kasstor-build >= 0.2.0).
		const jsonAtSrc = resolve(srcPath, "library-summary.json");
		if (existsSync(jsonAtSrc)) {
			return parseJsonSummary(jsonAtSrc, ctx);
		}

		// 3. Fallback: `<srcPath>/library-summary.ts` (older kasstor-build).
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

function parseJsonSummary(filePath: string, ctx: ExternalManifestSourceContext): ComponentDefinition[] | null {
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

/**
 * Parse a `library-summary.ts` of the form:
 *
 *   export const librarySummary = [ {...}, {...} ] as const satisfies LibraryComponents;
 *
 * We use the TS API to walk the first exported array literal and evaluate it
 * as JSON-compatible data. Anything non-literal (function calls, identifiers,
 * template literals with substitutions) becomes `null` for that node — the
 * consumer sees `undefined` fields rather than a crash.
 *
 * Kept as a fallback for projects on `@genexus/kasstor-build` versions older
 * than 0.2.0 that don't yet emit a sibling `.json`.
 */
function parseTsLiteralSummary(filePath: string, ctx: ExternalManifestSourceContext): ComponentDefinition[] | null {
	try {
		const text = readFileSync(filePath, "utf8");
		const sf = tsModule.createSourceFile(filePath, text, tsModule.ScriptTarget.Latest, /* setParentNodes */ true);

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

function findFirstArrayLiteralExport(sf: tsModule.SourceFile): tsModule.ArrayLiteralExpression | undefined {
	let result: tsModule.ArrayLiteralExpression | undefined;
	function visit(node: tsModule.Node): void {
		if (result) return;
		if (tsModule.isVariableStatement(node) && node.modifiers?.some(m => m.kind === tsModule.SyntaxKind.ExportKeyword)) {
			for (const decl of node.declarationList.declarations) {
				if (decl.initializer) {
					const init = stripWrappingExpressions(decl.initializer);
					if (tsModule.isArrayLiteralExpression(init)) {
						result = init;
						return;
					}
				}
			}
		}
		tsModule.forEachChild(node, visit);
	}
	visit(sf);
	return result;
}

function stripWrappingExpressions(node: tsModule.Expression): tsModule.Expression {
	let cur: tsModule.Expression = node;
	while (
		tsModule.isAsExpression(cur) ||
		tsModule.isParenthesizedExpression(cur) ||
		tsModule.isSatisfiesExpression(cur)
	) {
		cur = cur.expression;
	}
	return cur;
}

function evalLiteral(node: tsModule.Node): unknown {
	if (tsModule.isStringLiteral(node) || tsModule.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}
	if (tsModule.isNumericLiteral(node)) {
		return Number(node.text);
	}
	if (node.kind === tsModule.SyntaxKind.TrueKeyword) return true;
	if (node.kind === tsModule.SyntaxKind.FalseKeyword) return false;
	if (node.kind === tsModule.SyntaxKind.NullKeyword) return null;
	if (tsModule.isArrayLiteralExpression(node)) {
		return node.elements.map(evalLiteral);
	}
	if (tsModule.isObjectLiteralExpression(node)) {
		const obj: Record<string, unknown> = {};
		for (const prop of node.properties) {
			if (tsModule.isPropertyAssignment(prop)) {
				const key = propertyName(prop.name);
				if (key != null) obj[key] = evalLiteral(prop.initializer);
			}
		}
		return obj;
	}
	if (tsModule.isAsExpression(node) || tsModule.isParenthesizedExpression(node) || tsModule.isSatisfiesExpression(node)) {
		return evalLiteral(node.expression);
	}
	if (tsModule.isPrefixUnaryExpression(node) && tsModule.isNumericLiteral(node.operand)) {
		const sign = node.operator === tsModule.SyntaxKind.MinusToken ? -1 : 1;
		return sign * Number(node.operand.text);
	}
	// Anything else (call expressions, identifiers, template literals with
	// substitutions) is unrepresentable as a JSON value; surface as null.
	return null;
}

function propertyName(name: tsModule.PropertyName): string | undefined {
	if (tsModule.isIdentifier(name)) return name.text;
	if (tsModule.isStringLiteral(name) || tsModule.isNoSubstitutionTemplateLiteral(name)) return name.text;
	return undefined;
}
