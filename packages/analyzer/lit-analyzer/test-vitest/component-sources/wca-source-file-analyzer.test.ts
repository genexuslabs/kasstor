import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import { WcaSourceFileAnalyzer } from "../../src/lib/analyze/component-sources/wca-source-file-analyzer.js";
import { DefaultAnalyzerHtmlStore } from "../../src/lib/analyze/store/html-store/default-analyzer-html-store.js";
import { DefaultAnalyzerDefinitionStore } from "../../src/lib/analyze/store/definition-store/default-analyzer-definition-store.js";

const TS_OPTS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ESNext,
	experimentalDecorators: true,
	lib: ["lib.dom.d.ts", "lib.es2022.d.ts"],
	noEmit: true
};

const SAMPLE_LIT_SOURCE = `
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("wca-test-button")
export class WcaTestButton extends LitElement {
	/** Button label. */
	@property({ type: String }) label = "";

	@property({ type: Boolean, reflect: true }) disabled = false;
}

declare global {
	interface HTMLElementTagNameMap {
		"wca-test-button": WcaTestButton;
	}
}
`;

function buildProgramWithFile(filename: string, source: string): { program: ts.Program; sourceFile: ts.SourceFile } {
	const host = ts.createCompilerHost(TS_OPTS, true);
	const original = host.getSourceFile;
	host.getSourceFile = (name, lang, onError, shouldCreate) => {
		if (name.endsWith(filename)) {
			return ts.createSourceFile(name, source, lang, true);
		}
		return original.call(host, name, lang, onError, shouldCreate);
	};
	host.fileExists = (n: string) => n.endsWith(filename) || ts.sys.fileExists(n);
	host.readFile = (n: string) => (n.endsWith(filename) ? source : ts.sys.readFile(n));

	const program = ts.createProgram([filename], TS_OPTS, host);
	const sourceFile = program.getSourceFile(filename);
	if (!sourceFile) throw new Error("source file not loaded");
	return { program, sourceFile };
}

describe("WcaSourceFileAnalyzer", () => {
	it("absorbs a Lit @customElement into the htmlStore", () => {
		const { program, sourceFile } = buildProgramWithFile("/virtual/wca-fixture.ts", SAMPLE_LIT_SOURCE);
		const htmlStore = new DefaultAnalyzerHtmlStore();
		const definitionStore = new DefaultAnalyzerDefinitionStore();

		const adapter = new WcaSourceFileAnalyzer({
			ts,
			getProgram: () => program,
			getChecker: () => program.getTypeChecker()
		});

		adapter.analyzeAndAbsorb(sourceFile, { definitionStore, htmlStore });

		const tag = htmlStore.getHtmlTag("wca-test-button");
		expect(tag).toBeDefined();
		expect(tag?.attributes.some(a => a.name === "label")).toBe(true);
		expect(tag?.attributes.some(a => a.name === "disabled")).toBe(true);
	});

	it("registers the analysis result with the definition store", () => {
		const { program, sourceFile } = buildProgramWithFile("/virtual/wca-fixture.ts", SAMPLE_LIT_SOURCE);
		const htmlStore = new DefaultAnalyzerHtmlStore();
		const definitionStore = new DefaultAnalyzerDefinitionStore();

		const adapter = new WcaSourceFileAnalyzer({
			ts,
			getProgram: () => program,
			getChecker: () => program.getTypeChecker()
		});

		adapter.analyzeAndAbsorb(sourceFile, { definitionStore, htmlStore });

		const result = definitionStore.getAnalysisResultForFile(sourceFile);
		expect(result).toBeDefined();
		expect(result?.componentDefinitions.map(d => d.tagName)).toContain("wca-test-button");
	});

	it("forgets a previous analysis result on re-analyze", () => {
		const { program, sourceFile } = buildProgramWithFile("/virtual/wca-fixture.ts", SAMPLE_LIT_SOURCE);
		const htmlStore = new DefaultAnalyzerHtmlStore();
		const definitionStore = new DefaultAnalyzerDefinitionStore();

		const adapter = new WcaSourceFileAnalyzer({
			ts,
			getProgram: () => program,
			getChecker: () => program.getTypeChecker()
		});

		adapter.analyzeAndAbsorb(sourceFile, { definitionStore, htmlStore });
		const tagAfterFirst = htmlStore.getHtmlTag("wca-test-button");
		expect(tagAfterFirst).toBeDefined();

		adapter.analyzeAndAbsorb(sourceFile, { definitionStore, htmlStore });
		const tagAfterSecond = htmlStore.getHtmlTag("wca-test-button");
		expect(tagAfterSecond).toBeDefined();
	});

	it("absorbs the HTMLElement subclass extension from lib.dom.d.ts", () => {
		const { program } = buildProgramWithFile("/virtual/dummy.ts", "export {};");
		const htmlStore = new DefaultAnalyzerHtmlStore();

		const adapter = new WcaSourceFileAnalyzer({
			ts,
			getProgram: () => program,
			getChecker: () => program.getTypeChecker()
		});

		const ok = adapter.absorbDefaultLibSubclassExtension({ htmlStore });
		expect(ok).toBe(true);
	});
});
