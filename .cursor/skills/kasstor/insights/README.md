# @genexus/kasstor-insights

Utilities to **visualize and inspect** how Lit/Kasstor components behave at runtime in development. The main offering is a **performance-scan** component that shows a **visual overlay** of which components re-render and how often, so you can spot unnecessary updates and improve DX and final product quality.

## Table of Contents

- [Installation](#installation)
- [What this package does](#what-this-package-does)
- [Quick start](#quick-start)
- [Usage](#usage)
- [API](#api)
- [Development only](#development-only)

## Installation

```bash
npm i @genexus/kasstor-insights
```

Typically used as a dev dependency. The **@genexus/vite-plugin-kasstor** plugin can inject the performance-scan component for you when `insights` is enabled; you can also add it manually in your app.

## What this package does

- **Re-render overlay** — Patches Lit's update lifecycle and records which custom elements re-render. The **kst-performance-scan** component reads that data and renders a visual overlay next to each component that updated: it shows the **tag name** and **render count** (e.g. `app-button x 3`). So you see at a glance which parts of the tree are updating and how often.

- **DX and quality** — Makes it easy to find unnecessary re-renders, over-reactive state, or components that update too often. You get immediate visual feedback while developing, so you can keep the final product lean and responsive without guessing.

- **Development only** — Intended for development. The Vite plugin does not include it in production builds. If you add it manually, guard it with a dev check or dynamic import.

## Quick start

**Easiest:** use **@genexus/vite-plugin-kasstor** with `insights` enabled. The plugin injects the performance-scan component and the script that loads it into your app's HTML in dev. You don't add any component to your templates.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { kasstor } from "@genexus/vite-plugin-kasstor";

export default defineConfig({
  plugins: [kasstor({ insights: true })]
});
```

**Manual:** import the component and put the tag in your root or layout so it wraps (or sits next to) the tree you want to monitor.

```ts
import "@genexus/kasstor-insights/components/performance-scan.js";
import { html } from "lit";

// In your root template:
html`<kst-performance-scan></kst-performance-scan>
  <app-main></app-main>`;
```

## Usage

### Via Vite plugin

Enable **insights** in **@genexus/vite-plugin-kasstor** (e.g. `insights: true` or `insights: { performance: true }`). The plugin injects the performance-scan component and its script into the app in development. No need to import or add the tag yourself. See [vite-plugin/README.md](../vite-plugin/README.md#performance-insights).

### Manual: add the component

Import the component so the custom element is defined, then render **`<kst-performance-scan>`** in your app (e.g. in the root layout). It will show overlays for every Kasstor/Lit component that re-renders. Optionally set **`showFps`** to show FPS.

```ts
import "@genexus/kasstor-insights/components/performance-scan.js";
import { html } from "lit";

// Example: root component
render() {
  return html`
    <kst-performance-scan .showFps=${true}></kst-performance-scan>
    <main><app-content></app-content></main>
  `;
}
```

## API

### Component: kst-performance-scan

Custom element that displays a visual overlay for each Kasstor/Lit component that has re-rendered: tag name and render count. It uses global state populated by the package's patch of Lit's update cycle.

| Property   | Type      | Default | Description                    |
| ---------- | --------- | ------- | ------------------------------ |
| `showFps`  | `boolean` | `false` | When `true`, shows FPS in the UI. |

**Tag name:** `kst-performance-scan`.

**Import (side-effect to define the element):**

```ts
import "@genexus/kasstor-insights/components/performance-scan.js";
```

Or from the main entry (re-exports the component):

```ts
import "@genexus/kasstor-insights";
```

### Exports and types

The package exports the component class for typing or programmatic use:

```ts
import { KstPerformanceScan } from "@genexus/kasstor-insights";
```

Type for the component instance (e.g. in `querySelector` or refs):

```ts
declare global {
  interface HTMLElementTagNameMap {
    "kst-performance-scan": KstPerformanceScan;
  }
}
```

**KstPerformanceScan** has one public property:

- **`showFps: boolean`** — When `true`, the overlay also shows FPS. Default `false`.

Internal types used by the patch and the overlay (**PerformanceScanItemModel**, **PerformanceScanRenderedItems**) live in the package; you don't need them for normal usage.

## Development only

Use this package in **development** to inspect re-renders. In production builds with **@genexus/vite-plugin-kasstor**, the plugin does not inject the component when building for production. If you add `<kst-performance-scan>` manually, conditionally render or import it only in dev (e.g. `import.meta.env.DEV` or dynamic import) so it is not included in the production bundle.
