import type { Program, SourceFile, TypeChecker } from "typescript";
import type * as tsModule from "typescript";
import {
  convertAnalyzeResultToHtmlCollection,
  convertComponentDeclarationToHtmlTag
} from "../parse/convert-component-definitions-to-html-collection.js";
import type { DefaultAnalyzerDefinitionStore } from "../store/definition-store/default-analyzer-definition-store.js";
import { HtmlDataSourceKind } from "../store/html-store/html-data-source-merged.js";
import type { DefaultAnalyzerHtmlStore } from "../store/html-store/default-analyzer-html-store.js";
import { SourceFileComponentScanner } from "./source-file-component-scanner.js";

/**
 * Per-source-file component discovery for projects that don't ship a
 * Custom Elements Manifest or a kasstor library-summary. The heavy lifting
 * lives in {@link SourceFileComponentScanner}; this class is the bridge
 * that absorbs scan results into the analyzer's stores using the same
 * shape the manifest/summary sources use.
 */
export class SourceFileSource {
  private readonly scanner: SourceFileComponentScanner;

  constructor(
    private readonly opts: {
      ts: typeof tsModule;
      getProgram: () => Program;
      getChecker: () => TypeChecker;
    }
  ) {
    this.scanner = new SourceFileComponentScanner(opts);
  }

  private get program(): Program {
    return this.opts.getProgram();
  }

  /**
   * Scans a single source file for components, then absorbs the results
   * into the analyzer's stores. Forgets any prior result for this file
   * so re-runs after file edits stay consistent.
   */
  analyzeAndAbsorb(
    sourceFile: SourceFile,
    stores: { definitionStore: DefaultAnalyzerDefinitionStore; htmlStore: DefaultAnalyzerHtmlStore }
  ): void {
    const isDefaultLibrary = this.program.isSourceFileDefaultLibrary(sourceFile);
    const isExternalLibrary = this.program.isSourceFileFromExternalLibrary(sourceFile);

    // Skip TS default lib (except lib.dom) and @types/node — same fast-path
    // the upstream analyzer used to avoid 500 ms+ of work on every analysis.
    if (
      (isDefaultLibrary && sourceFile.fileName.match(/(lib\.dom\.d\.ts)/) == null) ||
      (isExternalLibrary && sourceFile.fileName.match(/(@types\/node)/) != null)
    ) {
      return;
    }

    const analyzeResult = this.scanner.scan(sourceFile);

    const reg = isDefaultLibrary
      ? HtmlDataSourceKind.BUILT_IN_DECLARED
      : HtmlDataSourceKind.DECLARED;

    const existingResult = stores.definitionStore.getAnalysisResultForFile(sourceFile);
    if (existingResult != null) {
      stores.htmlStore.forgetCollection(
        {
          tags: existingResult.componentDefinitions.map(d => d.tagName),
          global: {
            events: [],
            slots: [],
            cssParts: [],
            cssProperties: [],
            attributes: [],
            properties: []
          }
        },
        reg
      );
      stores.definitionStore.forgetAnalysisResultForFile(sourceFile);
    }

    stores.definitionStore.absorbAnalysisResult(sourceFile, analyzeResult);
    const htmlCollection = convertAnalyzeResultToHtmlCollection(analyzeResult, {
      checker: this.opts.getChecker(),
      addDeclarationPropertiesAsAttributes: this.program.isSourceFileFromExternalLibrary(sourceFile)
    });

    // Defense in depth: drop tags that the scanner picked up only because
    // of an `interface HTMLElementTagNameMap { "tag": HTMLChXxxElement }`
    // entry but couldn't resolve to a class declaration. Those entries
    // come back from the scanner with zero attrs/props/events, and
    // absorbing them would clobber the rich data a manifest source (CEM
    // ingest, kasstor library-summary) already wrote into the same
    // DECLARED bucket — exactly the symptom that turned `<ch-…>` property
    // bindings into "Unknown property" errors when a chameleon `.lit.ts`
    // got transitively pulled into the program. The proper fallback for
    // these cases is the manifest data; if no manifest covers the file,
    // the binding genuinely is unknown and the user gets a tag-level
    // diagnostic instead of a useless empty registration.
    htmlCollection.tags = htmlCollection.tags.filter(tag => {
      if (tag.declaration != null) return true;
      const empty =
        tag.attributes.length === 0 &&
        tag.properties.length === 0 &&
        tag.events.length === 0 &&
        tag.slots.length === 0 &&
        tag.cssParts.length === 0 &&
        tag.cssProperties.length === 0;
      return !empty;
    });

    stores.htmlStore.absorbCollection(htmlCollection, reg);
  }

  /**
   * Absorbs a synthetic `HTMLElement` subclass extension so generic event
   * listeners and shared attributes resolve on every element. Returns
   * `true` once the synthetic shape has been registered, so the caller
   * can avoid re-running.
   */
  absorbDefaultLibSubclassExtension(stores: { htmlStore: DefaultAnalyzerHtmlStore }): boolean {
    const sourceFile = this.program.getSourceFiles().find(sf => /lib\.dom\.d\.ts$/.test(sf.fileName));
    if (sourceFile == null) return false;
    const declaration = {
      sourceFile,
      node: sourceFile,
      declarationNodes: new Set([sourceFile]),
      kind: "class" as const,
      members: [],
      methods: [],
      events: [],
      slots: [],
      cssProperties: [],
      cssParts: [],
      heritageClauses: []
    };
    const extension = convertComponentDeclarationToHtmlTag(declaration, undefined, {
      checker: this.opts.getChecker()
    });
    stores.htmlStore.absorbSubclassExtension("HTMLElement", extension);
    return true;
  }
}
