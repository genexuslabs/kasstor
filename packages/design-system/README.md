# @genexus/kasstor-design-system

Design-system foundation for Kasstor. Provides:

- A global registry of design systems and their CSS bundle loaders.
- A theme-loader module that fetches bundles on demand, caches them, and
  shares the result across all consumers as `CSSStyleSheet` instances.

The `kst-theme` component that consumes this registry lives in
[`@genexus/kasstor-core`](../core/README.md). Use this package together with
core when you need runtime-loaded design-system themes.

## API Reference

### Design-system registry

| API                                   | Description                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registerDesignSystem(name, options)` | Registers a design system in the global registry. `options.bundleLoaders` is a map from bundle name → URL. Already-registered systems and bundle loaders are not overwritten (a warning is logged in development). |

### Theme loader

| API                                          | Description                                                                                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchStyleSheet(name, timeout?)`            | Resolves the bundle URL from the registry, fetches the CSS, builds a `CSSStyleSheet`, caches it, and resolves the waiters. Default `timeout` is `10000` ms.                                     |
| `getLoadedStyleSheet(name)`                  | Returns the cached `CSSStyleSheet` for a theme name, or `undefined` if the theme has not been loaded yet.                                                                                       |
| `setStyleSheetMapping(name, sheet)`          | Caches a `CSSStyleSheet` under `name` and resolves any pending waiters. Useful when the stylesheet is produced outside the standard fetch flow.                                                 |
| `getStyleSheetPromiseInfo(name, timeout?)`   | Low-level helper that returns (or creates) the promise associated with a theme name. Mostly used by `kst-theme` internals and by tests that need to pre-warm the promise with a custom timeout. |

### Resetting state (tests, HMR)

There is intentionally no public reset API. The package's global state is
held under `globalThis` so that test suites and HMR boundaries can clear it
without going through a destructive public function:

```ts
globalThis.geneXusDesignSystemsRegistry?.clear();
globalThis.geneXusDesignSystemsLoaders?.clear();
globalThis.geneXusDesignSystemsStyleSheets?.clear();
globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
```

Importing anything from `@genexus/kasstor-design-system` brings the type
declarations for these globals into scope.

## Installation

```bash
npm i @genexus/kasstor-design-system
```

This package has no peer dependencies — it is pure ESM / DOM logic.

## Quick example

```ts
import { registerDesignSystem } from "@genexus/kasstor-design-system";

registerDesignSystem("my-ds", {
  bundleLoaders: {
    "components/button": "/themes/button.css",
    "components/edit": "/themes/edit.css"
  }
});
```

Then, in a separate place, render a `<kst-theme>` (from
`@genexus/kasstor-core`) pointing at one or more of those bundle names. See
the [core docs](../core/src/components/theme/docs/usage.md) for examples.

