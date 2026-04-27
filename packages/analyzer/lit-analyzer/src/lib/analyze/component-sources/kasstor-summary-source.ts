import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SourceFile } from "typescript";
import { loadLibrarySummary } from "@genexus/kasstor-build/library-summary";
import { convertKasstorSummaryToCem } from "../parse/parse-kasstor-summary.js";
import type {
  ExternalManifestSource,
  ExternalManifestSourceContext,
  ResolvedManifest
} from "./external-manifest-source.js";
import { PackageRootIndex } from "./package-root-index.js";

const KASSTOR_SUMMARY_MARKER = "<kasstor-summary>";

/**
 * How far we walk into a project's directory tree looking for
 * `library-summary.{json,ts}` when running in `"auto"` mode.
 *
 * Two levels covers the common shapes:
 *   - flat:      `<programRoot>/src/library-summary.ts`             (depth 1)
 *   - monorepo:  `<programRoot>/packages/<pkg>/src/library-summary.ts` (depth 3)
 *
 * Three is the cap because the IDE plugin runs this on every cold start
 * and a deeper walk would scan unbounded `node_modules` trees.
 */
const AUTO_DISCOVERY_MAX_DEPTH = 3;
const AUTO_DISCOVERY_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".bun",
  "out",
  "lib",
  "coverage",
  ".turbo",
  ".next"
]);

/**
 * Resolves the Kasstor library summary for a project and exposes it as a CEM
 * `ResolvedManifest`.
 *
 * All file IO and TS literal parsing is delegated to
 * `@genexus/kasstor-build`'s `loadLibrarySummary` helper — `kasstor-build`
 * is the producer of the artifact and therefore the canonical owner of
 * the loader. This class only decides _where_ to look (mode resolution +
 * project-root discovery) and adapts the result into the
 * `ExternalManifestSource` contract that `default-lit-analyzer-context.ts`
 * consumes.
 *
 * Loading strategy (delegated to `loadLibrarySummary`, first match wins):
 *   1. `{ srcPath }` pointing at a `.json` file → JSON parse.
 *   2. `<srcPath>/library-summary.json` (kasstor-build ≥ 0.2.0).
 *   3. `<srcPath>/library-summary.ts` (older emit format, parsed via TS AST).
 *
 * Failures degrade to "no manifest" with a warning, never a thrown error.
 */
export class KasstorSummarySource implements ExternalManifestSource {
  readonly name = "kasstor-summary";

  private manifests: ResolvedManifest[] = [];
  private readonly index = new PackageRootIndex();

  constructor(private readonly mode: "auto" | { srcPath: string }) {}

  load(ctx: ExternalManifestSourceContext): readonly ResolvedManifest[] {
    // Trace at warn level so the discovery path always shows in
    // `lit-plugin.log`. Without this, "kasstor not loaded" is silent —
    // the only signal users get is "Unknown tag" diagnostics in their
    // editor, which doesn't help us tell apart "the loader didn't run"
    // from "the loader ran but found nothing".
    ctx.logger.warn(
      `[kasstor-summary] load() called (mode=${typeof this.mode === "string" ? this.mode : "explicit"}, programRoot=${ctx.programRoot})`
    );

    const srcPaths = this.resolveSrcPaths(ctx);
    if (srcPaths.length === 0) {
      ctx.logger.warn(
        `[kasstor-summary] no library-summary discovered (mode=${typeof this.mode === "string" ? this.mode : "explicit"}, programRoot=${ctx.programRoot})`
      );
      return [];
    }

    const resolved: ResolvedManifest[] = [];
    this.index.clear();

    for (const srcPath of srcPaths) {
      const loaded = loadLibrarySummary({
        srcPath,
        onWarning: msg => ctx.logger.warn(msg),
        onError: (msg, err) => ctx.logger.error(msg, err)
      });
      if (loaded == null) {
        ctx.logger.warn(`[kasstor-summary] loadLibrarySummary returned null for ${srcPath}`);
        continue;
      }

      const manifest = convertKasstorSummaryToCem(loaded.components);
      const packageRoot = this.findPackageRoot(srcPath);

      resolved.push({
        sourceName: KASSTOR_SUMMARY_MARKER,
        packageRoot,
        manifest
      });
      this.index.add(packageRoot, KASSTOR_SUMMARY_MARKER);
      // `warn`-level so the load is unconditionally surfaced in
      // `lit-plugin.log` even when verbose logging is off — this is the
      // single most useful signal the IDE plugin actually wired up the
      // user's components, and we'd rather pay one log line per cold
      // start than spend another debug session diagnosing "why no
      // kasstor suggestions" through silence.
      ctx.logger.warn(
        `[kasstor-summary] loaded ${loaded.components.length} component(s) from ${loaded.source} (format=${loaded.format}, packageRoot=${packageRoot})`
      );
    }

    this.manifests = resolved;
    return this.manifests;
  }

  coversSourceFile(sourceFile: SourceFile): string | undefined {
    return this.index.cover(sourceFile);
  }

  private resolveSrcPaths(ctx: ExternalManifestSourceContext): string[] {
    if (this.mode === "auto") {
      return discoverSummaryDirs(ctx.programRoot, AUTO_DISCOVERY_MAX_DEPTH);
    }
    return [resolve(ctx.programRoot, this.mode.srcPath)];
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

/**
 * Walks down from `root` (up to `maxDepth` levels) looking for directories
 * that contain a `library-summary.{json,ts}` file. Returns every match so
 * a monorepo with several kasstor packages registers all of them in one
 * pass.
 *
 * Skips entries listed in `AUTO_DISCOVERY_SKIP_DIRS` to avoid descending
 * into `node_modules` (the common cold-start performance trap) and other
 * build output. The walk also stops early once a directory yields a hit
 * — nested `library-summary` files inside a package that already has
 * one are vanishingly rare and would just duplicate components.
 */
function discoverSummaryDirs(root: string, maxDepth: number): string[] {
  const found: string[] = [];
  walk(resolve(root), 0);
  return found;

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return;
    if (!existsSync(dir)) return;

    if (
      existsSync(resolve(dir, "library-summary.json")) ||
      existsSync(resolve(dir, "library-summary.ts"))
    ) {
      found.push(dir);
      return;
    }

    if (depth === maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && entry.length > 1 && !AUTO_DISCOVERY_SKIP_DIRS.has(entry)) {
        // Hidden dirs like `.cache` aren't in our explicit skip-list but
        // are almost never the place a library-summary lives. Skip them.
        continue;
      }
      if (AUTO_DISCOVERY_SKIP_DIRS.has(entry)) continue;
      const child = resolve(dir, entry);
      let isDir = false;
      try {
        isDir = statSync(child).isDirectory();
      } catch {
        continue;
      }
      if (!isDir) continue;
      walk(child, depth + 1);
    }
  }
}
