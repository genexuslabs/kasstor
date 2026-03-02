---
name: kasstor
description: Build web components with Kasstor, migrate from Stencil to Lit/Kasstor, or create a library/application of web components using Lit. Use when working with Kasstor, Lit-based components, Stencil migration, or when the user mentions Kasstor, kasstor-build, kasstor-core, kasstor-insights, kasstor-signals, vite-plugin-kasstor, or kasstor-webkit.
---

# Kasstor — The natural builder for the web platform

An ecosystem for building Lit-based web components with first-class DX: decorators, SCSS, typed events, HMR, optional signals, etc.

## Instructions

- Use **this document** as the entry point: what Kasstor is, why use it, installation, requirements, and the packages table below.

- **Kasstor is split into packages.** Each package (core, signals, webkit, vite-plugin, build, insights) has its own npm package and documentation. The table in [Packages](#packages) lists them and links to each package’s README in this skill folder.

- **When you need details for a specific package**, open that package’s README (e.g. [core/README.md](core/README.md), [signals/README.md](signals/README.md)). At the top of each package README you’ll find an **API Reference table** that lists the APIs and links to sub-readmes with the full content. Use that table to choose which sub-readme to load instead of loading the whole package.

- Focus on **consuming** Kasstor packages (npm install, Vite config, component authoring).

---

## What is Kasstor?

**Kasstor** is a set of libraries and tooling around [Lit](https://lit.dev) for building custom element libraries and applications. It keeps the Lit programming model (templates, reactive properties, `LitElement`) and adds decorators, SCSS support, typed custom events, Hot Module Replacement, better SSR and initial-render performance, etc.—so you ship standard web components with less boilerplate and a smoother development experience than using Lit alone.

## Why Kasstor? (DX over plain Lit)

| With plain Lit                                                                                              | With Kasstor                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@customElement('tag')`** only registers the tag; Shadow DOM, styles, and config are manual per component | **`@Component({ tag, styles, shadow?, globalStyles?, metadata? })`** — registration, Shadow Root config (mode, delegatesFocus, formAssociated), SCSS, optional no-Shadow, global styles, metadata (`kstMetadata`), HMR in one place                                                                                           |
| CSS-in-JS or separate CSS files, no preprocessing                                                           | **SCSS/SASS** via Vite (import `styles from './component.scss?inline'` for variables, mixins, nesting); otherwise pass **styles as a string**                                                                                                                                                                                 |
| Custom events with ad-hoc `detail` types and manual dispatch                                                | **`@Event()` + `EventEmitter<T>`** — typed events and `emit()` with full type safety                                                                                                                                                                                                                                          |
| Components are loaded only via direct import                                                                | **More loading options** — direct import, or **declarative lazy loading** with the **`lazyLoad`** directive (load when the element is attached in a Lit template); requires the library to register loaders via **`registerCustomElementLoaders`** from `@genexus/kasstor-core`                                               |
| Full page reload on every change in dev                                                                     | **HMR** — component and style hot reload via `@genexus/vite-plugin-kasstor`                                                                                                                                                                                                                                                   |
| No built-in "react to property changes" hook beyond `willUpdate`                                            | **`@Observe()`** — run logic when specific properties change, with SSR-friendly lifecycle                                                                                                                                                                                                                                     |
| Default LitElement rendering; no optimization when many components mount at once                            | **Lower TBT (Total Blocking Time)** — optimized first paint when many components mount; initial render path is tuned so large trees block the main thread less and become interactive sooner (better LCP/TBT); in other words, better Lighthouse Performance scores                                                           |
| Lit has **`willUpdate`** but no "first update" hook; SSR-safe init before first paint is verbose            | **`firstWillUpdate`** — runs once before the first update; supports SSR-friendly initialization (e.g. data needed before first render) without extra boilerplate                                                                                                                                                              |
| Using the component without Shadow DOM requires custom setup                                                | **No-Shadow** — `shadow: false` in `@Component`; you can style the component the same way as with Shadow (use the component tag name instead of the `:host` selector in your styles)                                                                                                                                          |
| SSR and hydration need extra wiring (guards, lifecycle, directives)                                         | **SSR** — `firstWillUpdate`, `@Observe` lifecycle, and a **`renderByPlatform`** directive to conditionally render content on the server that may differ on the client or be client-only; initialization and reactive side effects are easier to make SSR-safe (global styles are client-only and not supported on the server) |

Your components still follow the Lit model: **`KasstorElement`** extends **`LitElement`**, and you use **`html`**, **`@property`**, **`@state`**, etc., as usual. Kasstor adds structure (e.g. **`@Component`**), styling (SCSS), events (**`@Event`**), directives (**`lazyLoad`**, **`renderByPlatform`**), tooling (HMR), etc., on top.

## Installation and quick example

Setup for a **Vite** project (recommended): install dependencies, configure Vite and TypeScript, then add a minimal component.

### Dependencies

```bash
npm i @genexus/kasstor-core
npm i -D @genexus/vite-plugin-kasstor vite typescript
```

You do **not** need to install `@genexus/kasstor-build` or `@genexus/kasstor-insights` when using the Vite plugin: the plugin integrates build tooling and optional performance insights for you.

### Project layout

A minimal layout. Use the **`.lit.ts`** (or `.lit.js`) extension for component files so the plugin can apply HMR and build-time analysis.

```
project/
├── src/
│   ├── components/
│   │   ├── counter.lit.ts
│   │   └── counter.scss
│   ├── main.ts
│   └── vite-env.d.ts        ← required for ?inline imports
├── index.html
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Vite configuration

Add the plugin in `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { kasstor } from "@genexus/vite-plugin-kasstor";

export default defineConfig({
  plugins: [kasstor()]
});
```

### TypeScript configuration

Kasstor uses **TypeScript decorators** (the legacy/experimental kind), not the current ECMAScript standard decorators. Your `tsconfig.json` must enable them and use the right class field semantics so that `@Component`, `@Event`, `@Observe`, and `@property` work correctly.

**Required:**

- **`experimentalDecorators: true`** — enables TypeScript decorators.
- **`useDefineForClassFields: false`** — keeps the class field semantics that Lit and Kasstor decorators expect (property descriptors on the prototype). With `true`, TypeScript uses standard field semantics and decorators can break.

A working baseline (adjust paths and options to your project):

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

If you use a different build tool or emit TypeScript yourself, keep at least `experimentalDecorators: true` and `useDefineForClassFields: false`.

### Vite environment types

Create `src/vite-env.d.ts` with the following content so TypeScript recognizes Vite-specific import suffixes like `?inline` (used when importing SCSS/CSS files):

```ts
// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />
```

Without this file, TypeScript will report an error on any `import styles from './component.scss?inline'` line.

### Example component

A minimal counter: decorator, SCSS, and a typed event.

**counter.scss**

```scss
:host {
  display: flex;
  align-items: center;
  gap: 12px;
}
button {
  padding-block: 10px;
  padding-inline: 20px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
}
span {
  min-inline-size: 40px;
  text-align: center;
}
```

**counter.lit.ts**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";
import { html } from "lit";
import { property } from "lit/decorators.js";
import styles from "./counter.scss?inline";

/**
 * Simple counter with increment/decrement and a typed change event.
 * @access public
 */
@Component({ tag: "app-counter", styles })
export class AppCounter extends KasstorElement {
  /** Current count value. */
  @property({ type: Number }) count = 0;

  /** Fired when the count changes; detail contains the new value. */
  @Event() protected countChanged!: EventEmitter<number>;

  #onIncrement = () => {
    this.count++;
    this.countChanged.emit(this.count);
  };

  #onDecrement = () => {
    this.count--;
    this.countChanged.emit(this.count);
  };

  override render() {
    return html`
      <button @click=${this.#onDecrement}>−</button>
      <span>${this.count}</span>
      <button @click=${this.#onIncrement}>+</button>
    `;
  }
}
```

**Usage in another Lit component**

```ts
html`<app-counter
  count="0"
  @countChanged=${(e: CustomEvent<number>) => console.log(e.detail)}
></app-counter>`;
```

### Entry point

If you are starting from scratch, create an `index.html` at the project root and a `src/main.ts` that imports your component.

**index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
    <script type="module" src="./src/main.ts"></script>
  </head>
  <body>
    <app-counter count="0"></app-counter>
  </body>
</html>
```

**src/main.ts**

Importing the component file runs `@Component`, which registers `<app-counter>` as a custom element. Without this import the browser does not know the tag and it will not render.

```ts
import "./components/counter.lit.js";
```

### Start the dev server

Add a `dev` script to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite --open"
  }
}
```

Then run:

```bash
npm run dev
```

Vite will start the dev server with HMR enabled and open your browser automatically.

## Requirements and best fit

- **Build tool:** Kasstor is designed to work best with **Vite**. The plugin provides HMR, build integration, and optional performance insights; you do **not** need to install `@genexus/kasstor-build` or `@genexus/kasstor-insights` separately when using it. Other bundlers can use `@genexus/kasstor-core` (and related packages) but without the integrated HMR and plugin features.

- **Base class:** Components using `@Component` must extend **`KasstorElement`** (not `LitElement` directly).

- **Tag name:** The component `tag` must be a valid custom element name with a hyphen (e.g. `app-counter`, `my-button`).

- **File naming:** For HMR and build analysis, use the **`.lit.ts`** / `.lit.js` convention; the Vite plugin can be configured to use other patterns if needed.

## Packages

| Package                                                     | Description                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**@genexus/kasstor-core**](./core/README.md)               | Core runtime: decorators (`@Component`, `@Event`, `@Observe`), directives (`lazyLoad`, `renderByPlatform`), and `KasstorElement` base class for Lit components.                                                                           |
| [**@genexus/vite-plugin-kasstor**](./vite-plugin/README.md) | Vite plugin: HMR for `.lit.ts` components and SCSS, build integration, and optional performance insights. **No need to install** `kasstor-build` or `kasstor-insights` when using this plugin.                                            |
| [**@genexus/kasstor-signals**](./signals/README.md)         | Reactive signals and computed values; optional state layer for Lit. Use the **`watch`** directive in templates for pin-point updates—only the bound parts re-render when a signal changes, without triggering a full component re-render. |
| [**@genexus/kasstor-webkit**](./webkit/README.md)           | Shared utilities: internationalization (i18n), array helpers, typeahead, and frame-sync helpers for apps and component libraries.                                                                                                         |
| [**@genexus/kasstor-insights**](./insights/README.md)       | Performance monitoring and benchmarking for Lit apps. Included via the Vite plugin when `insights` option is enabled; no need to install separately when using Vite.                                                                      |
| [**@genexus/kasstor-build**](./build/README.md)             | Library analysis and optional file generation (types, readmes). Used by the Vite plugin under the hood; no need to install separately when using Vite.                                                                                    |

Install only what you need; `@genexus/kasstor-core` plus the Vite plugin (`@genexus/vite-plugin-kasstor`) is the usual starting point.

