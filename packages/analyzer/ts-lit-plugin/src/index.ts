/* eslint-disable @typescript-eslint/no-explicit-any */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LitAnalyzerConfig } from "@genexus/kasstor-lit-analyzer";
import { LitAnalyzerLoggerLevel, makeConfig, VERSION } from "@genexus/kasstor-lit-analyzer";
import type * as ts from "typescript";
import type { CompilerOptions } from "typescript";
import type * as tsServer from "typescript/lib/tsserverlibrary.js";
import { decorateLanguageService } from "./decorate-language-service.js";
import { logger } from "./logger.js";
import { LitPluginContext } from "./ts-lit-plugin/lit-plugin-context.js";
import { TsLitPlugin } from "./ts-lit-plugin/ts-lit-plugin.js";
import { setTypescriptModule } from "./ts-module.js";

/**
 * Writes a single line to `<TMPDIR>/kasstor-lit-plugin-create-trace.log`
 * the first time `init()` is called inside a tsserver process. The user's
 * project root might not be writable from the IDE's tsserver process —
 * tmpdir always is — so this is a guaranteed-visible signal that says
 * "this is the bundle that loaded, this is where its log will live".
 *
 * The trace file is harmless to leave around; tsservers that respawn
 * append a new line per spawn so the timeline is preserved.
 */
function writeInitTrace(tsVersion: string): void {
  try {
    const file = join(tmpdir(), "kasstor-lit-plugin-create-trace.log");
    const line = `[${new Date().toISOString()}] kasstor-lit-plugin v${VERSION} init (typescript=${tsVersion}, dirname=${__dirname}, pid=${process.pid})\n`;
    appendFileSync(file, line);
  } catch {
    // tmpdir is unwritable on this host — nothing else we can do silently.
  }
}

const tsHtmlPluginSymbol = Symbol.for("__tsHtmlPlugin__");

let context: LitPluginContext | undefined = undefined;

/**
 * Export a function for the ts-service to initialize our plugin.
 * @param typescript
 */
export function init({ typescript }: { typescript: typeof ts }): tsServer.server.PluginModule {
	// Cache the typescript module
	setTypescriptModule(typescript);

	// Always-on trace at tmpdir — gives users a definitive "the new bundle
	// loaded into the live tsserver" signal that's independent of whether
	// the project root is writable.
	writeInitTrace(typescript.version);

	/**
	 * This function is used to print debug info once
	 * Yes, it's a self destructing function!
	 */
	let printDebugOnce: (() => void) | undefined = () => {
		if (logger.level >= LitAnalyzerLoggerLevel.DEBUG) {
			logger.debug(`Lit Analyzer: ${VERSION}`);
			logger.debug(`Running Typescript: ${typescript.version}`);
			logger.debug(`DIRNAME: ${__dirname}`);
			printDebugOnce = undefined;
		}
	};

	return {
		create: (info: tsServer.server.PluginCreateInfo) => {
			// Check if the language service is already decorated
			if ((info.languageService as any)[tsHtmlPluginSymbol] != null) {
				return info.languageService;
			}
			logger.setTsServerLogging(info.project.projectService.logger);

			// Save the current working directory
			info.config.cwd = info.config.cwd || info.project.getCurrentDirectory();

			// Extend existing language service with the plugin functions
			try {
				context = new LitPluginContext({
					// CJS↔ESM interop: this package is CJS (TS plugin loader
					// contract), but `LitPluginContextHandler["ts"]` expects
					// the ESM-shaped namespace from the analyzer. The runtime
					// value is identical in both views.
					ts: typescript as never,
					getProgram: () => {
						return info.languageService.getProgram()!;
					},
					getProject: () => {
						return info.project;
					}
				});

				context.updateConfig(makeConfig(info.config));

				logger.verbose("Starting @genexus/kasstor-ts-lit-plugin...");

				if (printDebugOnce != null) printDebugOnce();

				const plugin = new TsLitPlugin(info.languageService, context);

				const decoratedService = decorateLanguageService(info.languageService, plugin);

				// Save that we've extended this service to prevent extending it again
				(decoratedService as any)[tsHtmlPluginSymbol] = plugin;

				return decoratedService;
			} catch (e) {
				logger.error("@genexus/kasstor-ts-lit-plugin crashed while decorating the language service...", e);

				return info.languageService;
			}
		},

		/**
		 * Unfortunately this function isn't called with configuration from tsconfig.json
		 * @param externalConfig
		 */
		onConfigurationChanged(externalConfig?: Partial<LitAnalyzerConfig>) {
			if (context == null || externalConfig == null) return;

			// Manually merge in configuration from "tsconfig.json"
			const compilerOptions = context.project?.getCompilerOptions();
			const tsLitPluginOptions = compilerOptions != null ? readLitAnalyzerConfigFromCompilerOptions(compilerOptions) : undefined;

			// Make seed where options from "external" takes precedence over options from "tsconfig.json"
			const configSeed = {
				...(tsLitPluginOptions || {}),
				...externalConfig,

				// Also merge rules deep
				rules: {
					...(tsLitPluginOptions?.rules || {}),
					...(externalConfig.rules || {})
				}
			};

			context.updateConfig(makeConfig(configSeed));
			if (printDebugOnce != null) printDebugOnce();
		}
	};
}

/**
 * Resolves the nearest tsconfig.json and returns the configuration seed within
 * the plugins section. Three plugin names are recognized for compatibility:
 *   - "@genexus/kasstor-ts-lit-plugin" (current)
 *   - "@jackolope/ts-lit-plugin"      (upstream fork by Jack Robards)
 *   - "ts-lit-plugin"                 (original by Rune Mehlsen)
 * The first match wins.
 */
const RECOGNIZED_PLUGIN_NAMES = ["@genexus/kasstor-ts-lit-plugin", "@jackolope/ts-lit-plugin", "ts-lit-plugin"] as const;

function readLitAnalyzerConfigFromCompilerOptions(compilerOptions: CompilerOptions): Partial<LitAnalyzerConfig> | undefined {
	// Finds the plugin section
	if ("plugins" in compilerOptions) {
		const plugins = compilerOptions.plugins as ({ name: string } & Partial<LitAnalyzerConfig>)[];
		const tsLitPluginOptions = plugins.find(plugin => RECOGNIZED_PLUGIN_NAMES.includes(plugin.name as typeof RECOGNIZED_PLUGIN_NAMES[number]));
		if (tsLitPluginOptions != null) {
			return tsLitPluginOptions;
		}
	}

	return undefined;
}
