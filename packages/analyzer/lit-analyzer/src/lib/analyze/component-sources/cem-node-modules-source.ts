import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SourceFile } from "typescript";
import type { CemPackage } from "./cem-types.js";
import type {
  ExternalManifestSource,
  ExternalManifestSourceContext,
  ResolvedManifest
} from "./external-manifest-source.js";
import { PackageRootIndex } from "./package-root-index.js";

interface PackageJsonShape {
  name?: string;
  customElements?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readJsonSafe<T>(filePath: string): T | undefined {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/**
 * Walk up from `start` to find the closest directory containing a `package.json`.
 * Returns the directory or `undefined` if none found before the filesystem root.
 */
function findProjectRootFrom(start: string): string | undefined {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Returns the on-disk path of a direct dependency at the canonical
 * `<root>/node_modules/<name>` layout, or `undefined` if absent. Both bun and
 * pnpm honor this layout for direct deps even though deduplicated transitives
 * may live under `.pnpm/...` — we don't scan those because we restrict to
 * direct deps anyway.
 */
function resolveDirectDepPackageRoot(programRoot: string, name: string): string | undefined {
  const candidate = join(programRoot, "node_modules", name);
  return existsSync(join(candidate, "package.json")) ? candidate : undefined;
}

function isLegacyCemSchema(schemaVersion: string | undefined): boolean {
  if (!schemaVersion) return false;
  const major = Number.parseInt(schemaVersion.split(".")[0] ?? "", 10);
  return Number.isFinite(major) && major < 2;
}

/**
 * Source that scans `node_modules` for packages declaring a `customElements`
 * field in their `package.json`, parses the referenced manifest, and exposes
 * each as a `ResolvedManifest`.
 *
 * The scan is intentionally scoped to the user project's _direct_ dependencies
 * (`dependencies`, `devDependencies`, `peerDependencies`). A full recursive
 * walk of `node_modules` is not performed: in a 1000-package project that
 * would mean 1000 file reads on every context init with virtually no marginal
 * value, since transitive deps already surface through their direct parents'
 * declarations.
 */
export class CemNodeModulesSource implements ExternalManifestSource {
  readonly name = "cem-node-modules";

  private manifests: ResolvedManifest[] = [];
  private readonly index = new PackageRootIndex();

  load(ctx: ExternalManifestSourceContext): readonly ResolvedManifest[] {
    const projectRoot = findProjectRootFrom(ctx.programRoot) ?? ctx.programRoot;
    const projectPkgJsonPath = join(projectRoot, "package.json");
    const projectPkg = readJsonSafe<PackageJsonShape>(projectPkgJsonPath);
    if (!projectPkg) {
      ctx.logger.warn(
        `[cem-node-modules] no package.json at ${projectPkgJsonPath}; skipping scan.`
      );
      return [];
    }

    const directDeps = new Set<string>([
      ...Object.keys(projectPkg.dependencies ?? {}),
      ...Object.keys(projectPkg.devDependencies ?? {}),
      ...Object.keys(projectPkg.peerDependencies ?? {})
    ]);

    const out: ResolvedManifest[] = [];
    for (const depName of directDeps) {
      const pkgRoot = resolveDirectDepPackageRoot(projectRoot, depName);
      if (!pkgRoot) continue;
      const pkgJson = readJsonSafe<PackageJsonShape>(join(pkgRoot, "package.json"));
      if (!pkgJson?.customElements) continue;

      const manifestPath = join(pkgRoot, pkgJson.customElements);
      if (!existsSync(manifestPath)) {
        ctx.logger.warn(
          `[cem-node-modules] ${depName} declares customElements="${pkgJson.customElements}" but file is missing.`
        );
        continue;
      }

      const manifest = readJsonSafe<CemPackage>(manifestPath);
      if (!manifest) {
        ctx.logger.warn(`[cem-node-modules] failed to parse ${manifestPath}; skipping.`);
        continue;
      }

      if (isLegacyCemSchema(manifest.schemaVersion)) {
        ctx.logger.warn(
          `[cem-node-modules] ${depName} ships CEM schemaVersion="${manifest.schemaVersion}"; best-effort parse.`
        );
      }

      out.push({
        sourceName: pkgJson.name ?? depName,
        packageRoot: pkgRoot,
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

  /** For tests / introspection. */
  getLoadedManifests(): readonly ResolvedManifest[] {
    return this.manifests;
  }
}
