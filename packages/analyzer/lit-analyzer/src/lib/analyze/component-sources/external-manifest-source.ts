import type { Program, SourceFile } from "typescript";
import type * as tsModule from "typescript";
import type { CemPackage } from "./cem-types.js";

/**
 * A manifest resolved from some external source (npm package, project root,
 * Kasstor library summary, etc).
 */
export interface ResolvedManifest {
  /** A human-readable identifier for the source (npm package name, "<project>", etc). */
  sourceName: string;
  /** Absolute path to the package root (used to compute file coverage). */
  packageRoot: string;
  /** The Custom Elements Manifest payload. */
  manifest: CemPackage;
}

export interface ExternalManifestSourceContext {
  programRoot: string;
  ts: typeof tsModule;
  program: Program;
  logger: {
    debug: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

/**
 * A pluggable source of `ResolvedManifest`s. Implementations include:
 *  - `CemNodeModulesSource` (scans direct deps in node_modules)
 *  - `CemExplicitSource` (reads a list of manifest paths from config)
 *  - `KasstorSummarySource` (loads the Kasstor library-summary)
 *
 * The `WcaSourceFileAnalyzer` adapter does NOT implement this interface — it
 * runs at per-file granularity (as WCA always did), not at context-init time.
 *
 * Loading is intentionally synchronous: every concrete source uses sync IO
 * (`readFileSync`, `existsSync`, `JSON.parse`, TS parser). Wrapping that in
 * an async layer creates a fire-and-forget hazard inside the analyzer's sync
 * `findInvalidatedComponents` codepath. Implementations MUST NEVER throw —
 * surface failures via `ctx.logger` and return what was successfully loaded.
 */
export interface ExternalManifestSource {
  readonly name: string;

  load(ctx: ExternalManifestSourceContext): readonly ResolvedManifest[];

  /**
   * Returns a stable identifier for the source covering the given source file
   * (typically the npm package name), or `undefined` if not covered.
   *
   * The context uses this hook to skip WCA analysis for files inside packages
   * already described by a manifest. The matching MUST be O(1) or O(depth) —
   * implementations should index by `packageRoot` at load time.
   */
  coversSourceFile(sourceFile: SourceFile): string | undefined;
}
