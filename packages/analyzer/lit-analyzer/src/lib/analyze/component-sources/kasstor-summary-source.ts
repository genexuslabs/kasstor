import { existsSync } from "node:fs";
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
    const srcPath = this.resolveSrcPath(ctx);
    if (srcPath == null) return [];

    const loaded = loadLibrarySummary({
      srcPath,
      onWarning: msg => ctx.logger.warn(msg),
      onError: (msg, err) => ctx.logger.error(msg, err)
    });
    if (loaded == null) return [];

    const manifest = convertKasstorSummaryToCem(loaded.components);
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
