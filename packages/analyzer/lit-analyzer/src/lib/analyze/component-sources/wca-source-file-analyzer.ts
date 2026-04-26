import { analyzeHTMLElement, analyzeSourceFile } from "@jackolope/web-component-analyzer";
import type { Program, SourceFile, TypeChecker } from "typescript";
import type * as tsModule from "typescript";
import { convertAnalyzeResultToHtmlCollection, convertComponentDeclarationToHtmlTag } from "../parse/convert-component-definitions-to-html-collection.js";
import type { DefaultAnalyzerDefinitionStore } from "../store/definition-store/default-analyzer-definition-store.js";
import { HtmlDataSourceKind } from "../store/html-store/html-data-source-merged.js";
import type { DefaultAnalyzerHtmlStore } from "../store/html-store/default-analyzer-html-store.js";

/**
 * Adapter that confines all calls to `web-component-analyzer` (WCA) behind a
 * single class, so future replacement is a one-shot change.
 *
 * @deprecated Slated for removal once the CEM/library-summary ingestion path
 *   covers all relevant cases. Kept for compatibility with archives that have
 *   no manifest, and for files where the user explicitly opts in via config.
 */
export class WcaSourceFileAnalyzer {
	constructor(
		private readonly opts: {
			ts: typeof tsModule;
			getProgram: () => Program;
			getChecker: () => TypeChecker;
		}
	) {}

	private get program(): Program {
		return this.opts.getProgram();
	}

	private get ts(): typeof tsModule {
		return this.opts.ts;
	}

	/**
	 * Mirror of the original `findComponentsInFile` from `default-lit-analyzer-context.ts`.
	 * Forgets the previous result for this file (if any) and absorbs the new one.
	 */
	analyzeAndAbsorb(
		sourceFile: SourceFile,
		stores: { definitionStore: DefaultAnalyzerDefinitionStore; htmlStore: DefaultAnalyzerHtmlStore }
	): void {
		const isDefaultLibrary = this.program.isSourceFileDefaultLibrary(sourceFile);
		const isExternalLibrary = this.program.isSourceFileFromExternalLibrary(sourceFile);

		// Same fast-path filter as upstream — saves ~500ms on startup by skipping
		// most of the default lib + @types/node.
		if (
			(isDefaultLibrary && sourceFile.fileName.match(/(lib\.dom\.d\.ts)/) == null) ||
			(isExternalLibrary && sourceFile.fileName.match(/(@types\/node)/) != null)
		) {
			return;
		}

		const analyzeResult = analyzeSourceFile(sourceFile, {
			program: this.program,
			ts: this.ts,
			config: {
				features: ["event", "member", "slot", "csspart", "cssproperty"],
				analyzeGlobalFeatures: !isDefaultLibrary,
				analyzeDefaultLib: true,
				analyzeDependencies: true,
				analyzeAllDeclarations: false,
				excludedDeclarationNames: ["HTMLElement"]
			}
		});

		const reg = isDefaultLibrary ? HtmlDataSourceKind.BUILT_IN_DECLARED : HtmlDataSourceKind.DECLARED;

		// Forget previous result for this file
		const existingResult = stores.definitionStore.getAnalysisResultForFile(sourceFile);
		if (existingResult != null) {
			stores.htmlStore.forgetCollection(
				{
					tags: existingResult.componentDefinitions.map(d => d.tagName),
					global: {
						events: existingResult.globalFeatures?.events.map(e => e.name),
						slots: existingResult.globalFeatures?.slots.map(s => s.name || ""),
						cssParts: existingResult.globalFeatures?.cssParts.map(s => s.name || ""),
						cssProperties: existingResult.globalFeatures?.cssProperties.map(s => s.name || ""),
						attributes: existingResult.globalFeatures?.members.filter(m => m.kind === "attribute").map(m => m.attrName || ""),
						properties: existingResult.globalFeatures?.members.filter(m => m.kind === "property").map(m => m.propName || "")
					}
				},
				reg
			);
			stores.definitionStore.forgetAnalysisResultForFile(sourceFile);
		}

		// Absorb new result
		stores.definitionStore.absorbAnalysisResult(sourceFile, analyzeResult);
		const htmlCollection = convertAnalyzeResultToHtmlCollection(analyzeResult, {
			checker: this.opts.getChecker(),
			addDeclarationPropertiesAsAttributes: this.program.isSourceFileFromExternalLibrary(sourceFile)
		});
		stores.htmlStore.absorbCollection(htmlCollection, reg);
	}

	/**
	 * Mirror of the original `analyzeSubclassExtensions`. Idempotent caller is
	 * responsible for tracking "already analyzed".
	 */
	absorbDefaultLibSubclassExtension(stores: { htmlStore: DefaultAnalyzerHtmlStore }): boolean {
		const result = analyzeHTMLElement(this.program, this.ts);
		if (result != null) {
			const extension = convertComponentDeclarationToHtmlTag(result, undefined, { checker: this.opts.getChecker() });
			stores.htmlStore.absorbSubclassExtension("HTMLElement", extension);
			return true;
		}
		return false;
	}
}
