import { resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const require = createRequire(import.meta.url);

const HERE = fileURLToPath(new URL(".", import.meta.url));

/**
 * Path to the **bundled** TS Language Service plugin entry — the exact
 * file that ships inside the `.vsix` and gets loaded by Cursor/VS Code's
 * tsserver. Tests import this so they validate the artifact users run,
 * not a freshly-resolved workspace symlink.
 */
export const BUNDLED_PLUGIN_ENTRY = resolve(
  HERE,
  "../../built/node_modules/@genexus/kasstor-ts-lit-plugin/index.js"
);

export const FIXTURE_PROJECT_ROOT = resolve(HERE, "../fixtures/mini-kasstor-project").replace(/\\/g, "/");

export interface PluginHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decorated: any;
  ls: ts.LanguageService;
  fileName: string;
  source: string;
  dispose: () => void;
}

/**
 * Build a TS Language Service against the fixture project, load the
 * bundled plugin, and decorate the LS. Returns a handle the test can use
 * to call `getCompletionsAtPosition`, `getSemanticDiagnostics`, etc.
 *
 * Mirrors what tsserver does internally — minus the sandbox — so tests
 * exercise the full plugin contract: lazy externals load, htmlStore
 * absorption from the kasstor library-summary, and the LS decorator
 * try-catch wrapping that the IDE relies on for resilience.
 */
export function createPluginHost(opts: {
  source: string;
  fileName?: string;
  config?: Record<string, unknown>;
}): PluginHandle {
  const fileName = (opts.fileName ?? resolve(FIXTURE_PROJECT_ROOT, "src/test.lit.ts")).replace(/\\/g, "/");
  const files = new Map<string, { text: string; version: string }>([
    [fileName, { text: opts.source, version: "1" }]
  ]);

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: f => files.get(f)?.version ?? "0",
    getScriptSnapshot: f => {
      const i = files.get(f);
      if (i) return ts.ScriptSnapshot.fromString(i.text);
      if (ts.sys.fileExists(f)) return ts.ScriptSnapshot.fromString(ts.sys.readFile(f) ?? "");
      return undefined;
    },
    getCurrentDirectory: () => FIXTURE_PROJECT_ROOT,
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.dom.d.ts", "lib.esnext.d.ts"],
      experimentalDecorators: true,
      strict: true,
      noEmit: true
    }),
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: f => files.has(f) || ts.sys.fileExists(f),
    readFile: f => files.get(f)?.text ?? ts.sys.readFile(f),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories
  };
  const ls = ts.createLanguageService(host);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const init = require(BUNDLED_PLUGIN_ENTRY) as (m: { typescript: typeof ts }) => {
    create(info: unknown): unknown;
  };
  const plugin = init({ typescript: ts });

  const info = {
    config: {
      name: "@genexus/kasstor-ts-lit-plugin",
      strict: true,
      kasstorSummary: "auto",
      externalManifests: { scanNodeModules: true },
      analyzeSourceFiles: "auto",
      ...opts.config
    },
    languageService: ls,
    project: {
      getCurrentDirectory: () => FIXTURE_PROJECT_ROOT,
      projectService: {
        logger: {
          info: () => {},
          msg: () => {},
          hasLevel: () => false,
          loggingEnabled: () => false
        }
      },
      getCancellationToken: () => ({
        isCancellationRequested: () => false,
        throwIfCancellationRequested: () => {}
      })
    },
    serverHost: ts.sys
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decorated = (plugin as any).create(info);

  return {
    decorated,
    ls,
    fileName,
    source: opts.source,
    dispose: () => ls.dispose()
  };
}

export function htmlStoreOf(handle: PluginHandle): {
  getHtmlTag(name: string): unknown;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tsLitPlugin = handle.decorated[Symbol.for("__tsHtmlPlugin__")] as any;
  return tsLitPlugin?.context?.htmlStore;
}
