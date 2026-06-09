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

## Installation

```bash
npm i -D @genexus/kasstor-build
```

Typically installed as a dev dependency. Most apps use it indirectly via **@genexus/vite-plugin-kasstor**; library authors or custom build pipelines can call **`buildLibrary`** directly.

## What this package does

- **Library analysis** — Discovers components from your source (by file pattern and decorator names), parses `@Component`, `@property`, `@Event`, etc., and builds a structured definition per component.

- **Custom-element global types** — Emits a `declare global` block (typed `querySelector`/`querySelectorAll`, event detail types, typed listeners, `HTMLElementTagNameMap`) into the **exported types file** (e.g. `components.ts`). This used to be appended to each component file; that legacy content is now removed by a transitional cleanup (see `cleanupLegacyComponentTypes`).

- **Per-component README** — Writes a `readme.md` next to each component with properties, events, slots, CSS parts, and usage extracted from the definition. Docs stay in sync with code.

- **Exported types for the library** — Generates a framework-agnostic core file (e.g. `components.ts`) that re-exports all types used by the components and declares the `ComponentProperties` / `ComponentEvents` namespaces. Gives library consumers one entry point for types. (The SolidJS `ComponentPropertiesSolidJS` namespace is generated inside the SolidJS JSX file instead.)

- **Per-framework JSX types** — Opt-in files that augment each framework's `IntrinsicElements` so the components type-check in JSX templates (component properties, `className`/`class`, `style`, `ref`, `aria-*`, `role`, native event handlers, and custom events). All three are opt-in (React `components.react.ts`, SolidJS, StencilJS). Event handler naming is framework-correct: React uses its own handler prop name for native events the component re-declares (e.g. `onInput`, re-typed with the component's event) and `on` + the verbatim event name for custom events; StencilJS uses `on` + the capitalized event name (native events come from its `HTMLAttributes`); and SolidJS uses the namespaced `on:` directive.

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
    typeDeclarationsFolder: number;
    /** @deprecated Always 0; per-component type files are no longer generated. */
    typesForComponents: number;
    cleanup: number;
    readmesForComponents: number;
  };
  updatedReadmesForComponents: string[];
  /** @deprecated Always empty; global types now live in the exported types file. */
  updatedTypesForComponents: string[];
  /** Component files whose legacy auto-generated content was removed. */
  cleanedComponentTypeFiles: string[];
}>;
```

- **options** — Same shape as **KasstorBuildOptions** (see below). Optional; defaults apply when omitted.

- **incrementalBuild** — When `true` or an object, enables incremental mode: only new or changed components are written. Use in dev/watch to avoid full rebuilds.

- **Returns** — `componentsBuilded` maps tag name to component data; `elapsedTimes` are in ms; `updatedReadmesForComponents` and `updatedTypesForComponents` are arrays of tag names that were written.

### Options (`KasstorBuildOptions`)

The same type is used by **@genexus/vite-plugin-kasstor**. You can import **KasstorBuildOptions** and **KasstorBuildComponentData** from `@genexus/kasstor-build`. Full type definition:

```ts
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
        // Core, framework-agnostic types file. `true`/omitted -> "components.ts".
        // A string sets a custom name; `false` disables it.
        exportTypesForTheLibrary?: string | boolean;
        // React JSX types (imports `react`). Opt-in: `false`/omitted off; `true`
        // -> "components.react.ts"; or a custom name. Depends on
        // `exportTypesForTheLibrary` (which must also be on).
        exportTypesForReact?: string | boolean;
        // SolidJS JSX types (imports `solid-js`). Opt-in: `false`/omitted off;
        // `true` -> "components.solid.ts"; or a custom name.
        exportTypesForSolidJs?: string | boolean;
        // StencilJS JSX types (imports `@stencil/core`). Opt-in: `false`/omitted
        // off; `true` -> "components.stencil.ts"; or a custom name.
        exportTypesForStencil?: string | boolean;
        librarySummary?: string | false;
        // @deprecated No effect; the custom-element global types now live in the
        // exportTypesForTheLibrary file (no longer appended to each component file).
        typesForComponents?: boolean;
        // Removes the legacy auto-generated `declare global` block from the
        // processed component files. Transitional, idempotent. Default `true`.
        cleanupLegacyComponentTypes?: boolean;
        readmesForComponents?: boolean;
      };

  /** Paths or patterns to include. Exclusions take precedence. */
  includedPaths?: RegExp | RegExp[];

  /**
   * Base path relative to process.cwd() where component sources live.
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

- **elapsedTimes** — Milliseconds for analysis, librarySummary, exportTypesForTheLibrary, typeDeclarationsFolder, cleanup, readmesForComponents (`typesForComponents` is kept for compatibility and is always 0).

- **updatedReadmesForComponents** — Tag names of components whose readme was written.

- **updatedTypesForComponents** — _Deprecated; always empty._ Per-component type files are no longer generated.

- **cleanedComponentTypeFiles** — Absolute paths of component files whose legacy auto-generated content was removed.

## What gets generated

- **Library summary** — Written to `{relativeComponentsSrcPath}/{fileGeneration.librarySummary}` (default `src/library-summary.ts`). Exports a const array of component definitions plus type declarations.

- **Exported types** — Written to `{relativeComponentsSrcPath}/{fileGeneration.exportTypesForTheLibrary}` (default `src/components.ts`). Framework-agnostic core file re-exporting types used by properties, events, and methods, plus the `ComponentBaseClasses`, `ComponentProperties` and `ComponentEvents` declarations, and a `declare global` block with the custom-element element types (typed `querySelector`, event details, listeners, `HTMLElementTagNameMap`). Self-contained. (The SolidJS `ComponentPropertiesSolidJS` namespace lives in the SolidJS JSX file.)

- **Per-framework JSX types** — Opt-in files (all off by default: React `exportTypesForReact`, default name `components.react.ts`; SolidJS `exportTypesForSolidJs`; StencilJS `exportTypesForStencil`) that augment each framework's `IntrinsicElements`. Each imports its framework and depends on the core file (so it must be generated too): React and SolidJS re-declare their props locally (`ComponentPropertiesReact` / `ComponentPropertiesSolidJS`), while StencilJS re-uses the core `ComponentProperties` namespace.

- **Legacy per-component types cleanup** — Component files that used the previous generation had a `declare global` block appended after a `// ######### Auto generated below #########` marker. That content now lives in the exported types file, so the build removes it from those files (transitional, idempotent; `fileGeneration.cleanupLegacyComponentTypes`, on by default).

- **Per-component readme** — `readme.md` in the same directory as the component file. Contains tables for properties, events, slots, CSS parts, and usage derived from the definition.

All paths are relative to **process.cwd()** and **relativeComponentsSrcPath**.
