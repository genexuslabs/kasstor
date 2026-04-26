import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import type { SourceFile } from "typescript";
import type { CemPackage } from "./cem-types.js";
import type {
  ExternalManifestSource,
  ExternalManifestSourceContext,
  ResolvedManifest
} from "./external-manifest-source.js";
import { PackageRootIndex } from "./package-root-index.js";

function isLegacyCemSchema(schemaVersion: string | undefined): boolean {
  if (!schemaVersion) return false;
  const major = Number.parseInt(schemaVersion.split(".")[0] ?? "", 10);
  return Number.isFinite(major) && major < 2;
}

/**
 * Source that loads CEM manifests from explicit paths (config-provided).
 *
 * Each path is resolved against `programRoot` if relative. The "package root"
 * of an explicit manifest is its containing directory — used by
 * `coversSourceFile` to skip WCA on files that live alongside the manifest.
 */
export class CemExplicitSource implements ExternalManifestSource {
  readonly name = "cem-explicit";

  private manifests: ResolvedManifest[] = [];
  private readonly index = new PackageRootIndex();

  constructor(private readonly paths: readonly string[]) {}

  load(ctx: ExternalManifestSourceContext): readonly ResolvedManifest[] {
    const out: ResolvedManifest[] = [];
    for (const p of this.paths) {
      const abs = isAbsolute(p) ? p : resolve(ctx.programRoot, p);
      if (!existsSync(abs)) {
        ctx.logger.warn(`[cem-explicit] manifest not found at ${abs}; skipping.`);
        continue;
      }

      let manifest: CemPackage | undefined;
      try {
        manifest = JSON.parse(readFileSync(abs, "utf8")) as CemPackage;
      } catch (err) {
        ctx.logger.error(`[cem-explicit] failed to parse ${abs}`, err);
        continue;
      }

      if (isLegacyCemSchema(manifest.schemaVersion)) {
        ctx.logger.warn(
          `[cem-explicit] ${abs} has schemaVersion="${manifest.schemaVersion}"; best-effort parse.`
        );
      }

      out.push({
        sourceName: abs,
        packageRoot: dirname(abs),
        manifest
      });
    }

    this.manifests = out;
    this.index.clear();
    for (const m of out) this.index.add(m.packageRoot, m.sourceName);
    return out;
  }

  coversSourceFile(sourceFile: SourceFile): string | undefined {
    return this.index.cover(sourceFile);
  }

  getLoadedManifests(): readonly ResolvedManifest[] {
    return this.manifests;
  }
}
