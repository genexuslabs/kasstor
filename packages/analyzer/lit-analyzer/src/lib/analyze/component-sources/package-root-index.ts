import { normalize, resolve } from "node:path";
import type { SourceFile } from "typescript";

/**
 * Maps a set of "package root" directories to a source-name marker, supporting
 * O(depth) lookup for any source file path that lives under one of them.
 *
 * Path normalization is centralized here so that all manifest sources share a
 * single rule for how to compare paths produced by TypeScript (which uses
 * forward slashes even on Windows) against paths produced by Node's `path`
 * module (which uses native separators on Windows).
 */
export class PackageRootIndex {
	private readonly roots = new Map<string, string>();

	/**
	 * Register a `packageRoot` directory under a `sourceName` marker.
	 * No-op when `packageRoot` is empty.
	 */
	add(packageRoot: string, sourceName: string): void {
		if (!packageRoot) return;
		this.roots.set(normalize(packageRoot), sourceName);
	}

	/**
	 * Returns the `sourceName` of the package whose root is an ancestor of
	 * `sourceFile.fileName`, or `undefined` if no registered root contains it.
	 *
	 * Walks up the path one directory at a time. The walk terminates either at
	 * a known root (success) or at the filesystem root (no match). The cost is
	 * bounded by directory nesting depth — typically <20 even in deep monorepos.
	 */
	cover(sourceFile: SourceFile): string | undefined {
		// `sourceFile.fileName` from TS uses POSIX separators; `normalize` keeps
		// it as-is on POSIX hosts and converts to native separators on Windows
		// so it matches keys inserted by `add()`.
		let dir = normalize(sourceFile.fileName);
		while (true) {
			const found = this.roots.get(dir);
			if (found !== undefined) return found;
			const parent = resolve(dir, "..");
			if (parent === dir) return undefined;
			dir = parent;
		}
	}

	/** For tests / introspection. */
	size(): number {
		return this.roots.size;
	}

	/** Reset the index — used when the source reloads. */
	clear(): void {
		this.roots.clear();
	}
}
