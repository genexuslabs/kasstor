# @genexus/vite-plugin-kasstor

Vite plugin that wires **@genexus/kasstor-build** and **@genexus/kasstor-insights** into a single entry point and adds **Hot Module Replacement (HMR)** for components built with **@genexus/kasstor-core**.

## Table of Contents

- [Installation](#installation)

- [What this plugin does](#what-this-plugin-does)

- [Quick start](#quick-start)

- [Configuration](#configuration)
  - [Plugin options](#plugin-options)
  - [Options reference](#options-reference)

- [HMR](#hmr)
  - [How it works](#how-it-works)
  - [Limitations](#limitations)

- [Build integration](#build-integration)

- [Performance insights](#performance-insights)

- [Compatibility](#compatibility)

- [Contributing](#contributing)

## Installation

```bash
npm i -D @genexus/vite-plugin-kasstor
```

## What this plugin does

- **Single entry point** — Uses `@genexus/kasstor-build` for library analysis and optional file generation (types, readmes, summary) and, in dev, can enable `@genexus/kasstor-insights` for performance metrics.

- **HMR for components** — On save, updates `@Component`-decorated Lit components without a full page reload. Uses the Vite module graph to know which components (and styles) to refresh.

- **HMR for styles** — When an SCSS file used by a component changes, only that component's `adoptedStyleSheets` are replaced instead of reloading the page.

- **Build-time automation** — Runs library analysis at build start; can generate per-component types, readmes, and exported types for the library (driven by `fileGeneration` and path options).

- **Optional performance insights** — In development, can inject the performance-scan component from `@genexus/kasstor-insights` so you can measure and inspect metrics.

## Quick start

Add the plugin to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { kasstor } from "@genexus/vite-plugin-kasstor";

export default defineConfig({
  plugins: [kasstor()]
});
```

**Convention:** The plugin expects Kasstor component files to use the **`.lit.ts`** (or `.lit.js`) extension by default. Name your component files like `my-button.lit.ts` so they are picked up for HMR and for build/library analysis. You can override this with `includedPaths.component`.

**Defaults**: HMR for components and styles enabled, insights off, component files matched by `/.lit\.(ts|js)$/`, styles by `/(\.scss|\.scss\.js)$/`. At build start the plugin runs **@genexus/kasstor-build** and, unless you set `fileGeneration: false`, generates documentation and types (library summary, per-component types and readmes, exported types for the library).

## Configuration

### Plugin options

The plugin accepts an optional options object. TypeScript types are exported from the package:

```ts
import { defineConfig } from "vite";
import { kasstor, type KasstorPluginOptions } from "@genexus/vite-plugin-kasstor";

const options: KasstorPluginOptions = {
  hmr: { component: true, styles: true },
  insights: { performance: true },
  includedPaths: {
    component: /\.lit\.(ts|js)$/,
    styles: /(\.scss|\.scss\.js)$/
  },
  excludedPaths: [/node_modules/],
  debug: false
};

export default defineConfig({
  plugins: [kasstor(options)]
});
```

### Options reference

The plugin accepts the same options type used in code. Options from **@genexus/kasstor-build** are passed through to the build step.

```ts
import type { KasstorBuildOptions } from "@genexus/kasstor-build";

/**
 * Options for the Kasstor Vite plugin
 */
export type KasstorPluginOptions = {
  debug?: boolean;

  /**
   * Paths or patterns to exclude when searching for components or style files.
   *
   * If a path or pattern is specified, components matching these will be
   * excluded from HMR and documentation generation.
   *
   * Exclusions take precedence over inclusions.
   */
  excludedPaths?: RegExp | RegExp[];

  /**
   * Enables or disables Hot Module Replacement (HMR) for components and styles.
   *
   * If `true`, HMR is enabled for both components and styles.
   *
   * When the HMR is enabled for components, private fields (#field) are
   * transformed to public fields (__field), enabling proxy-based HMR for class
   * instances. Without this, HMR for class instances is not possible when they
   * use private fields.
   *
   * ⚠️ Known limitations for HMR in components:
   *   - The state of the render is destroyed and reconstructed during HMR.
   *   - The `willUpdate` method is not properly updated on components when HMR is enabled.
   *
   * ⚠️ Known limitations for HMR in styles:
   *   - Changing transitive scss files does not trigger a refresh in components that import them.
   *     For example, if a component "X" uses a scss file "A" that imports another scss file "B",
   *     changes to "B" will not trigger a style refresh for the component "X".
   */
  hmr?:
    | boolean
    | {
        /**
         * If `true`, HMR is enabled for components.
         */
        component?: boolean;

        /**
         * If `true`, HMR is enabled for styles.
         */
        styles?: boolean;
      };

  /**
   * Paths or patterns to include when searching for components or style files.
   *
   * If a path or pattern is specified, only components matching these will be
   * included in HMR and documentation generation.
   *
   * Exclusions take precedence over inclusions.
   */
  includedPaths?: {
    /**
     * Regular expression to match Lit component files.
     * @default /\.lit\.ts$/
     */
    component: RegExp | RegExp[];

    /**
     * Regular expression to match SCSS files for Lit components.
     * @default /\.scss$/
     */
    styles?: RegExp | RegExp[];
  };

  insights?:
    | boolean
    | {
        performance?: boolean;
      };
} & Pick<
  KasstorBuildOptions,
  | "customComponentDecoratorNames"
  | "defaultComponentAccess"
  | "excludedPublicMethods"
  | "fileGeneration"
>;
```

For the shape of **`fileGeneration`** and other **KasstorBuildOptions** fields, see **@genexus/kasstor-build**.

## HMR

### How it works

1. The plugin detects changes to files that match component or style patterns.

2. For **components**, it uses the Vite module graph to find which custom elements depend on the changed module, then triggers HMR so the custom element definition is re-registered with the new class. When component HMR is enabled, private fields are transformed so instances can be updated.

3. For **styles**, it determines which component modules import the changed SCSS (via the module graph) and replaces `adoptedStyleSheets` on those components.

4. No full page reload; only the affected components or their styles are updated.

### Limitations

**Components**

- Render state is destroyed and reconstructed during HMR; do not rely on it persisting across updates.

- The `willUpdate` lifecycle may not reflect the new implementation when a component is updated via HMR.

**Styles**

- Changing a **transitive** SCSS file (e.g. file B imported by file A, where the component imports A) does not trigger a style refresh for that component.

- Only **direct** SCSS imports from the component module are tracked for style HMR.

## Build integration

At **build start** (dev and production), the plugin runs **@genexus/kasstor-build** library analysis. It discovers components matching `includedPaths.component` (minus `excludedPaths`) and, unless `fileGeneration: false`, can auto-generate:

- **Per-component types** — Appended at the end of each component file. Expose properties, events, and methods so the IDE can autocomplete them in Lit templates, type event details, and type `querySelector` / `querySelectorAll` for your custom elements.

- **Per-component README** — A README next to each component with properties, events, slots, CSS parts, and usage extracted from the definition. Keeps docs in sync with the code without writing them by hand.

- **Exported types for the library** — A single file (e.g. `components.ts`) that re-exports all types used by the components (props, event details, etc.). Simplifies consuming the library from TypeScript and other frameworks.

- **Library summary** — A summary of all components and their metadata (tag, props, events). Useful for tooling, showcases, or feeding LLMs.

All of this uses the same path and decorator options you pass to the plugin (`includedPaths`, `excludedPaths`, `customComponentDecoratorNames`, etc.). No extra Vite config is required; the plugin runs the build step when present.

**DX benefits:** Autocomplete and type safety in templates, up-to-date component docs with no manual maintenance, and a single types entry point for library consumers.

## Performance insights

When **`insights`** is enabled (e.g. `insights: true` or `insights: { performance: true }`):

- The plugin injects the **performance-scan** component from `@genexus/kasstor-insights` into the app’s HTML in development, plus the script that loads it.

- In the UI you get a **visual overlay** that highlights which components re-render and how often: each Kasstor component that updates is shown with its tag name and render count.

- That makes it easy to spot unnecessary re-renders and to tune performance (e.g. reduce updates or fix reactive dependencies).

- Only available in development; production builds do not include insights.

## Compatibility

- **Vite:** 6.x, 7.x, 8.x
- **@genexus/kasstor-core:** ~0.2.0
- **@genexus/kasstor-build:** ~0.1.1
- **@genexus/kasstor-insights:** ~0.2.0
- **Node.js:** 22+

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for how to report issues and submit changes.

