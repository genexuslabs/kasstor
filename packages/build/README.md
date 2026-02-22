# @genexus/kasstor-build

Utilities to **analyze** Lit component libraries and **auto-generate** documentation, type declarations, and metadata. Used by **@genexus/vite-plugin-kasstor**; you can also call it directly from scripts or build tools.

## Table of Contents

- [Installation](#installation)

- [What this package does](#what-this-package-does)

- [Quick start](#quick-start)

- [Usage](#usage)

- [API](#api)
  - [`buildLibrary`](#buildlibrary)
  - [Options (`KasstorBuildOptions`)](#options-kasstorbuildoptions)
  - [Return value](#return-value)

- [What gets generated](#what-gets-generated)

- [Contributing](#contributing)

## Installation

```bash
npm i -D @genexus/kasstor-build
```

Typically installed as a dev dependency. Most apps use it indirectly via **@genexus/vite-plugin-kasstor**; library authors or custom build pipelines can call **`buildLibrary`** directly.

## What this package does

- **Library analysis** — Discovers components from your source (by file pattern and decorator names), parses `@Component`, `@property`, `@Event`, etc., and builds a structured definition per component.

- **Per-component types** — Appends auto-generated TypeScript at the end of each component file so IDEs get autocomplete for properties, events, and methods in Lit templates, and so `querySelector` / event details are typed.

- **Per-component README** — Writes a `readme.md` next to each component with properties, events, slots, CSS parts, and usage extracted from the definition. Docs stay in sync with code.

- **Exported types for the library** — Generates a single file (e.g. `components.ts`) that re-exports all types used by the components. Gives library consumers one entry point for types.

- **Library summary** — Generates a summary (e.g. `library-summary.ts`) with metadata for all components. Useful for tooling, showcases, or feeding LLMs.

- **Incremental builds** — When used with `incrementalBuild`, only changed components are re-processed (e.g. in a dev server). Reduces build time after the first run.

**Benefits:** Better DX (autocomplete, type safety in templates), up-to-date docs without manual maintenance, and a single types entry point for consumers. Integration with the Vite plugin means this runs automatically at build start when using the plugin.

## Quick start

Minimal call (uses defaults: component files matching `/.lit\.ts$/` — use the **`.lit.ts`** extension for Kasstor components so the Vite plugin and build both find them; output under `src/`; all file generation enabled):

```ts
import { buildLibrary } from "@genexus/kasstor-build";

const result = await buildLibrary();

console.log(
  `Updated types: ${result.updatedTypesForComponents.length}, readmes: ${result.updatedReadmesForComponents.length}`
);
```

With options:

```ts
import { buildLibrary, type KasstorBuildOptions } from "@genexus/kasstor-build";

const options: KasstorBuildOptions = {
  includedPaths: /\.lit\.ts$/,
  excludedPaths: [/node_modules/],
  relativeComponentsSrcPath: "src/",
  fileGeneration: {
    typesForComponents: true,
    readmesForComponents: true,
    exportTypesForTheLibrary: "components.ts",
    librarySummary: "library-summary.ts"
  }
};

const result = await buildLibrary(options);
```

## Usage

- **Via Vite** — Add **@genexus/vite-plugin-kasstor** to your Vite config. The plugin calls `buildLibrary` at build start and passes through your options (`fileGeneration`, `includedPaths`, etc.). No need to call `buildLibrary` yourself.

- **Direct** — From a Node script or custom build step, call `buildLibrary(options)`. Run from the project root (paths are relative to `process.cwd()` and `relativeComponentsSrcPath`).

- **Incremental** — In a dev server, pass `incrementalBuild: true` (or an object with `initialBuild` / `tagNamesToRemove`) so only changed components are regenerated. The plugin uses this when watching files.

## API

### `buildLibrary`

```ts
function buildLibrary(
  options?: KasstorBuildOptions,
  incrementalBuild?:
    | boolean
    | {
        initialBuild?: Map<string, KasstorBuildComponentData>;
        tagNamesToRemove?: string[];
      }
): Promise<{
  componentsBuilded: Map<string, KasstorBuildComponentData>;
  elapsedTimes: {
    analysis: number;
    librarySummary: number;
    exportTypesForTheLibrary: number;
    typesForComponents: number;
    readmesForComponents: number;
  };
  updatedReadmesForComponents: string[];
  updatedTypesForComponents: string[];
}>;
```

- **options** — Same shape as **KasstorBuildOptions** (see below). Optional; defaults apply when omitted.

- **incrementalBuild** — When `true` or an object, enables incremental mode: only new or changed components are written. Use in dev/watch to avoid full rebuilds.

- **Returns** — `componentsBuilded` maps tag name to component data; `elapsedTimes` are in ms; `updatedReadmesForComponents` and `updatedTypesForComponents` are arrays of tag names that were written.

### Options (`KasstorBuildOptions`)

The same type is used by **@genexus/vite-plugin-kasstor**. You can import **KasstorBuildOptions** and **KasstorBuildComponentData** from `@genexus/kasstor-build`. Full type definition:

```ts
/**
 * Options for buildLibrary. Import from "@genexus/kasstor-build".
 */
export type KasstorBuildOptions = {
  /** Decorator names treated as component decorators. Default: ["Component"]. */
  customComponentDecoratorNames?: string[];

  /** Default access for generated definitions. */
  defaultComponentAccess?: "public" | "private" | "protected" | "package";

  /**
   * Paths or patterns to exclude when searching for components.
   * Exclusions take precedence over inclusions.
   */
  excludedPaths?: RegExp | RegExp[];

  excludedPublicMethods?: string[];

  /**
   * Options for file generation. Set to `false` to disable all generation.
   * Otherwise each sub-option controls one kind of output.
   */
  fileGeneration?:
    | false
    | {
        /**
         * File name (or path) for the single file that exports all types
         * used by the components. E.g. "components.ts". If `false`, not generated.
         */
        exportTypesForTheLibrary?: string | false;

        /**
         * File name for the library summary. If `false`, not generated.
         */
        librarySummary?: string | false;

        /**
         * If `true`, each component file gets auto-generated types appended
         * (for IDE autocomplete, event details, querySelector typing).
         */
        typesForComponents?: boolean;

        /**
         * If `true`, a readme.md is written next to each component
         * with properties, events, slots, CSS parts, etc.
         */
        readmesForComponents?: boolean;
      };

  /**
   * Paths or patterns to include. Only matching files are analyzed.
   * Exclusions take precedence.
   */
  includedPaths?: RegExp | RegExp[];

  /**
   * Base path relative to process.cwd() where component sources live
   * and where librarySummary / exportTypesForTheLibrary are written.
   * @default "src/"
   */
  relativeComponentsSrcPath?: string;
};

export type KasstorBuildComponentData = {
  component: ComponentDefinition;
  fileContent: string;
  filePath: string;
};
```

**ComponentDefinition** is the parsed component metadata (tagName, properties, events, methods, slots, etc.); its full shape is in the package TypeScript definitions.

### Return value

- **componentsBuilded** — `Map<tagName, KasstorBuildComponentData>`. Each value has the parsed **ComponentDefinition**, the file content, and the file path.

- **elapsedTimes** — Milliseconds for analysis, librarySummary, exportTypesForTheLibrary, typesForComponents, readmesForComponents.

- **updatedReadmesForComponents** — Tag names of components whose readme was written.

- **updatedTypesForComponents** — Tag names of components whose in-file types were written.

## What gets generated

- **Library summary** — Written to `{relativeComponentsSrcPath}/{fileGeneration.librarySummary}` (default `src/library-summary.ts`). Exports a const array of component definitions plus type declarations.

- **Exported types** — Written to `{relativeComponentsSrcPath}/{fileGeneration.exportTypesForTheLibrary}` (default `src/components.ts`). Single file re-exporting types used by properties, events, and methods.

- **Per-component types** — Appended after an auto-generated marker in each component source file. Updated only when the component or its events/description change (when using incremental build).

- **Per-component readme** — `readme.md` in the same directory as the component file. Contains tables for properties, events, slots, CSS parts, and usage derived from the definition.

All paths are relative to **process.cwd()** and **relativeComponentsSrcPath**.

## Contributing

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more information.
