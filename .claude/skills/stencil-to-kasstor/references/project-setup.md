# Project Setup

This page covers the project-level changes needed to migrate from StencilJS to Kasstor: dependencies, configuration files, and build tooling.

## Dependencies

### Remove StencilJS packages

Uninstall all Stencil-related dependencies:

```bash
npm uninstall @stencil/core @stencil/sass @stencil/store @stencil/react-output-target @stencil-community/eslint-plugin
```

Remove any other `@stencil/*` packages your project uses.

### Install Kasstor packages

```bash
npm i @genexus/kasstor-core
npm i -D @genexus/vite-plugin-kasstor vite typescript sass
```

If your project used `@stencil/store` for global state management, install the signals package:

```bash
npm i @genexus/kasstor-signals
```

You do **not** need to install `@genexus/kasstor-build` or `@genexus/kasstor-insights` separately — the Vite plugin integrates them.

## ESLint Configuration

Remove all Stencil-specific ESLint configuration:

- Remove `@stencil-community/eslint-plugin` from your ESLint config (`.eslintrc`, `eslint.config.js`, etc.)
- Remove any Stencil-specific rules (e.g. `@stencil-community/required-jsdoc`, `@stencil-community/decorators-style`)

## TypeScript Configuration

Remove any Stencil-specific compiler options or references. Then ensure your `tsconfig.json` includes these required options:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "es2022",
    "moduleResolution": "bundler"
  }
}
```

- **`experimentalDecorators: true`** — enables the TypeScript decorators that Kasstor and Lit use.
- **`useDefineForClassFields: false`** — keeps class field semantics compatible with Lit decorators. With `true`, `@property` and other decorators break.

Recommended full configuration:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "es2022",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "dist/",
    "rootDir": "./src",
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "vite.config.ts", "**/*.e2e.ts"]
}
```

## Vite Configuration

Replace `stencil.config.ts` with a `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { kasstor } from "@genexus/vite-plugin-kasstor";

export default defineConfig({
  plugins: [kasstor()]
});
```

After applying all migrations, delete `stencil.config.ts`.

### Vite Environment Types

Create `src/vite-env.d.ts` so TypeScript recognizes the `?inline` import suffix:

```ts
// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />
```

Without this file, TypeScript reports errors on `import styles from './component.scss?inline'` lines.

### Migrating the `bundles` Option

Stencil's `bundles` option grouped components into the same JS chunk:

```ts
// stencil.config.ts
bundles: [{ components: ["my-action-menu", "my-action-menu-item"] }];
```

In Kasstor, this is handled naturally by ES module imports. If `my-action-menu` always uses `my-action-menu-item`, add a direct import:

```ts
import "./action-menu-item.lit.js";
```

The bundler analyzes the import graph and optimizes chunks automatically with full application context.

## Testing Setup

See [testing.md](testing.md) for the complete testing migration guide, including dependency changes and Vitest configuration.
