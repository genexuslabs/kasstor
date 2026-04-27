import * as tsMod from "typescript";
import type { HostCancellationToken, Program, SourceFile, TypeChecker } from "typescript";
import type * as tsServer from "typescript/lib/tsserverlibrary.js";
import { ALL_RULES } from "../rules/all-rules.js";
import { CemExplicitSource } from "./component-sources/cem-explicit-source.js";
import { CemNodeModulesSource } from "./component-sources/cem-node-modules-source.js";
import type { ExternalManifestSource, ExternalManifestSourceContext, ResolvedManifest } from "./component-sources/external-manifest-source.js";
import { KasstorSummarySource } from "./component-sources/kasstor-summary-source.js";
import { SourceFileSource } from "./component-sources/source-file-source.js";
import { MAX_RUNNING_TIME_PER_OPERATION } from "./constants.js";
import { getBuiltInHtmlCollection } from "./data/get-built-in-html-collection.js";
import { getUserConfigHtmlCollection } from "./data/get-user-config-html-collection.js";
import type { LitAnalyzerConfig } from "./lit-analyzer-config.js";
import { isRuleDisabled, makeConfig } from "./lit-analyzer-config.js";
import type { LitAnalyzerContext, LitAnalyzerContextBaseOptions, LitPluginContextHandler } from "./lit-analyzer-context.js";
import { DefaultLitAnalyzerLogger, LitAnalyzerLoggerLevel } from "./lit-analyzer-logger.js";
import { convertCemPackageToHtmlCollection } from "./parse/parse-cem-collection.js";
import { parseDependencies } from "./parse/parse-dependencies/parse-dependencies.js";
import { refineGenericTagTypesInScope } from "./parse/refine-generics.js";
import { RuleCollection } from "./rule-collection.js";
import { DefaultAnalyzerDefinitionStore } from "./store/definition-store/default-analyzer-definition-store.js";
import { DefaultAnalyzerDependencyStore } from "./store/dependency-store/default-analyzer-dependency-store.js";
import { DefaultAnalyzerDocumentStore } from "./store/document-store/default-analyzer-document-store.js";
import { DefaultAnalyzerHtmlStore } from "./store/html-store/default-analyzer-html-store.js";
import { HtmlDataSourceKind } from "./store/html-store/html-data-source-merged.js";
import { changedSourceFileIterator } from "./util/changed-source-file-iterator.js";

export class DefaultLitAnalyzerContext implements LitAnalyzerContext {
	protected componentSourceFileIterator = changedSourceFileIterator();
	protected hasAnalyzedSubclassExtensions = false;
	protected _config: LitAnalyzerConfig = makeConfig({});

	get ts(): typeof tsMod {
		return this.handler.ts || tsMod;
	}

	get program(): Program {
		return this.handler.getProgram();
	}

	get project(): tsServer.server.Project | undefined {
		return this.handler.getProject != null ? this.handler.getProject() : undefined;
	}

	get config(): LitAnalyzerConfig {
		return this._config;
	}

	private _currentStartTime = Date.now();
	private _currentTimeout = MAX_RUNNING_TIME_PER_OPERATION;
	get currentRunningTime(): number {
		return Date.now() - this._currentStartTime;
	}

	private _currentCancellationToken: HostCancellationToken | undefined = undefined;
	private _hasRequestedCancellation = false;
	private _throwOnRequestedCancellation = false;
	get isCancellationRequested(): boolean {
		if (this._hasRequestedCancellation) {
			return true;
		}

		if (this._currentCancellationToken == null) {
			// Never cancel if "cancellation token" is not present
			// This means that we are in a CLI context, and are willing to wait for the operation to finish for correctness reasons
			return false;
		}

		if (this._currentCancellationToken?.isCancellationRequested()) {
			if (!this._hasRequestedCancellation) {
				this.logger.error("Cancelling current operation because project host has requested cancellation");
			}

			this._hasRequestedCancellation = true;
		}

		if (this.currentRunningTime > this._currentTimeout) {
			if (!this._hasRequestedCancellation) {
				this.logger.error(
					`Cancelling current operation because it has been running for more than ${this._currentTimeout}ms (${this.currentRunningTime}ms)`
				);
			}

			this._hasRequestedCancellation = true;
		}

		// Throw if necessary
		if (this._hasRequestedCancellation && this._throwOnRequestedCancellation) {
			throw new this.ts.OperationCanceledException();
		}

		return this._hasRequestedCancellation;
	}

	private _currentFile: SourceFile | undefined;
	get currentFile(): SourceFile {
		if (this._currentFile == null) {
			throw new Error("Current file is not set");
		}

		return this._currentFile;
	}

	readonly htmlStore = new DefaultAnalyzerHtmlStore();
	readonly dependencyStore = new DefaultAnalyzerDependencyStore();
	readonly documentStore = new DefaultAnalyzerDocumentStore();
	readonly definitionStore = new DefaultAnalyzerDefinitionStore();
	readonly logger = new DefaultLitAnalyzerLogger();

	/** Lazy native scanner for source files without a manifest/summary. */
	private sourceFileSource: SourceFileSource | undefined;

	/** Built and loaded lazily on first analysis (or eagerly on `updateConfig`). */
	private externalSources: ExternalManifestSource[] | undefined;
	private externalsLoaded = false;
	private loadedManifests: ResolvedManifest[] = [];

	private _rules: RuleCollection | undefined;
	get rules(): RuleCollection {
		if (this._rules == null) {
			this._rules = new RuleCollection();
			this._rules.push(...ALL_RULES);
		}

		return this._rules;
	}

	setContextBase({ file, timeout, throwOnCancellation }: LitAnalyzerContextBaseOptions): void {
		this._currentFile = file;
		this._currentStartTime = Date.now();
		this._currentTimeout = timeout ?? MAX_RUNNING_TIME_PER_OPERATION;
		this._currentCancellationToken = this.project?.getCancellationToken();
		this._throwOnRequestedCancellation = throwOnCancellation ?? false;
		this._hasRequestedCancellation = false;
	}

	updateConfig(config: LitAnalyzerConfig): void {
		const previousConfig = this._config;
		this._config = config;

		this.logger.level = (() => {
			switch (config.logging) {
				case "off":
					return LitAnalyzerLoggerLevel.OFF;
				case "error":
					return LitAnalyzerLoggerLevel.ERROR;
				case "warn":
					return LitAnalyzerLoggerLevel.WARN;
				case "debug":
					return LitAnalyzerLoggerLevel.DEBUG;
				case "verbose":
					return LitAnalyzerLoggerLevel.VERBOSE;
				default:
					return LitAnalyzerLoggerLevel.OFF;
			}
		})();

		// Add user configured HTML5 collection
		const collection = getUserConfigHtmlCollection(config, this);
		this.htmlStore.absorbCollection(collection, HtmlDataSourceKind.USER);

		// Rebuild external sources if relevant config changed.
		if (this.externalSourcesConfigChanged(previousConfig, config)) {
			this.externalSources = undefined;
			this.externalsLoaded = false;
			this.loadedManifests = [];
		}
	}

	private externalSourcesConfigChanged(prev: LitAnalyzerConfig, next: LitAnalyzerConfig): boolean {
		return (
			prev.analyzeSourceFiles !== next.analyzeSourceFiles ||
			JSON.stringify(prev.externalManifests) !== JSON.stringify(next.externalManifests) ||
			JSON.stringify(prev.kasstorSummary) !== JSON.stringify(next.kasstorSummary)
		);
	}

	updateDependencies(file: SourceFile): void {
		this.findDependenciesInFile(file);
	}

	updateComponents(file: SourceFile): void {
		this.findInvalidatedComponents();
		this.analyzeSubclassExtensions();
	}

	private get checker(): TypeChecker {
		return this.program.getTypeChecker();
	}

	constructor(private handler: LitPluginContextHandler) {
		// Add all HTML5 tags and attributes
		const builtInCollection = getBuiltInHtmlCollection(this);
		this.htmlStore.absorbCollection(builtInCollection, HtmlDataSourceKind.BUILT_IN);
	}

	private getSourceFileSource(): SourceFileSource {
		if (this.sourceFileSource == null) {
			this.sourceFileSource = new SourceFileSource({
				ts: this.ts,
				getProgram: () => this.program,
				getChecker: () => this.checker
			});
		}
		return this.sourceFileSource;
	}

	private buildExternalSources(): ExternalManifestSource[] {
		const sources: ExternalManifestSource[] = [];
		const cfg = this.config;

		if (cfg.externalManifests.scanNodeModules) {
			sources.push(new CemNodeModulesSource());
		}

		if (cfg.externalManifests.paths && cfg.externalManifests.paths.length > 0) {
			sources.push(new CemExplicitSource(cfg.externalManifests.paths));
		}

		if (cfg.kasstorSummary !== false) {
			sources.push(new KasstorSummarySource(cfg.kasstorSummary));
		}

		return sources;
	}

	private buildExternalSourceContext(): ExternalManifestSourceContext {
		return {
			programRoot: this.config.cwd || this.program.getCurrentDirectory(),
			ts: this.ts,
			program: this.program,
			logger: {
				debug: msg => this.logger.debug(msg),
				warn: msg => this.logger.warn(msg),
				error: (msg, err) => this.logger.error(msg, err)
			}
		};
	}

	/**
	 * Loads all configured external manifest sources synchronously and absorbs
	 * each resulting collection into `htmlStore` under
	 * `HtmlDataSourceKind.DECLARED`. Idempotent: subsequent calls are no-ops
	 * until `updateConfig` invalidates the cache.
	 *
	 * Synchronous on purpose. All sources use sync IO (`readFileSync`,
	 * `existsSync`, TS parser); awaiting an async wrapper would only
	 * introduce a fire-and-forget hazard inside the analyzer's sync
	 * `findInvalidatedComponents` codepath.
	 */
	private ensureExternalsLoaded(): void {
		if (this.externalsLoaded) return;

		const sources = this.externalSources ?? (this.externalSources = this.buildExternalSources());
		if (sources.length === 0) {
			this.externalsLoaded = true;
			return;
		}

		const ctx = this.buildExternalSourceContext();

		for (const src of sources) {
			try {
				const manifests = src.load(ctx);
				for (const m of manifests) {
					const collection = convertCemPackageToHtmlCollection(m.manifest, { sourceName: m.sourceName });
					this.htmlStore.absorbCollection(collection, HtmlDataSourceKind.DECLARED);
				}
				this.loadedManifests.push(...manifests);
				this.logger.debug(`[${src.name}] absorbed ${manifests.length} manifest(s)`);
			} catch (err) {
				this.logger.error(`[${src.name}] failed to load`, err);
			}
		}

		this.externalsLoaded = true;
	}

	private isFileCoveredByExternalSource(sourceFile: SourceFile): string | undefined {
		if (this.externalSources == null) return undefined;
		for (const src of this.externalSources) {
			const found = src.coversSourceFile(sourceFile);
			if (found) return found;
		}
		return undefined;
	}

	private findInvalidatedComponents() {
		const startTime = Date.now();

		// Synchronous: externals are ingested before any WCA call so that
		// `coversSourceFile` short-circuits files already described by CEM.
		this.ensureExternalsLoaded();

		const seenFiles = new Set<SourceFile>();
		const invalidatedFiles = new Set<SourceFile>();

		const getRunningTime = () => {
			return Date.now() - startTime;
		};

		// Find components in all changed files
		for (const sourceFile of this.componentSourceFileIterator(this.program.getSourceFiles())) {
			if (this.isCancellationRequested) {
				break;
			}

			seenFiles.add(sourceFile);

			// All components definitions that use this file must be invidalited
			this.definitionStore.getDefinitionsWithDeclarationInFile(sourceFile).forEach(definition => {
				const sf = this.program.getSourceFile(definition.sourceFile.fileName);
				if (sf != null) {
					invalidatedFiles.add(sf);
				}
			});

			this.logger.debug(`Analyzing components in ${sourceFile.fileName} (changed) (${getRunningTime()}ms total)`);
			this.findComponentsInFile(sourceFile);
		}

		for (const sourceFile of invalidatedFiles) {
			if (this.isCancellationRequested) {
				break;
			}

			if (!seenFiles.has(sourceFile)) {
				seenFiles.add(sourceFile);

				this.logger.debug(`Analyzing components in ${sourceFile.fileName} (invalidated) (${getRunningTime()}ms total)`);
				this.findComponentsInFile(sourceFile);
			}
		}

		this.logger.verbose(`Analyzed ${seenFiles.size} files (${invalidatedFiles.size} invalidated) in ${getRunningTime()}ms`);
	}

	private findComponentsInFile(sourceFile: SourceFile) {
		const policy = this.config.analyzeSourceFiles;

		// "never": no per-file source-code component discovery at all.
		if (policy === "never") return;

		// All policies: skip files already covered by a loaded manifest.
		if (this.isFileCoveredByExternalSource(sourceFile)) return;

		// "auto": skip third-party packages from `node_modules` whose CEM (if
		// any) was already absorbed. We deliberately do NOT skip TypeScript's
		// default libraries (lib.dom.d.ts and friends) — even when they live
		// inside `node_modules/typescript/lib`, they describe built-in HTML
		// elements that lit-analyzer relies on for property/event typing.
		if (policy === "auto") {
			const isDefaultLibrary = this.program.isSourceFileDefaultLibrary(sourceFile);
			const isExternalLibrary = this.program.isSourceFileFromExternalLibrary(sourceFile);
			if (isExternalLibrary && !isDefaultLibrary) return;
		}

		this.getSourceFileSource().analyzeAndAbsorb(sourceFile, {
			definitionStore: this.definitionStore,
			htmlStore: this.htmlStore
		});

		// Refine generic instantiations declared in HTMLElementTagNameMap.
		// Closes upstream runem/lit-analyzer#149 — generic LitElement
		// subclasses registered like `'tag': MyEl<{id: number}>` now have
		// their property/attribute types substituted at the binding site.
		refineGenericTagTypesInScope(name => this.htmlStore.getHtmlTag(name), sourceFile, this.checker);
	}

	private analyzeSubclassExtensions() {
		if (this.hasAnalyzedSubclassExtensions) return;
		if (this.config.analyzeSourceFiles === "never") return;

		const ok = this.getSourceFileSource().absorbDefaultLibSubclassExtension({ htmlStore: this.htmlStore });
		if (ok) this.hasAnalyzedSubclassExtensions = true;
	}

	private findDependenciesInFile(file: SourceFile) {
		if (isRuleDisabled(this.config, "no-missing-import")) return;

		// Build a graph of component dependencies
		const res = parseDependencies(file, this);
		this.dependencyStore.absorbComponentDefinitionsForFile(file, res);
	}
}
