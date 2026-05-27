# @genexus/kasstor-design-system

Foundation for design-system theming in Kasstor. Provides:

- A **global registry** of design systems and their CSS bundle loaders (bundle name → URL).
- A **theme loader** that fetches bundles on demand, caches them, and shares the result as `CSSStyleSheet` instances.

The package renders nothing on its own. Consumers:

- [`sharedDesignSystemStyles`](../core/decorators.md#shared-design-system-styles) on `@Component` — for components that want a bundle adopted into their own root.
- [`kst-theme`](../core/components.md#kst-theme) from `@genexus/kasstor-core` — for adopting bundles at the page / `ShadowRoot` level.

Both share the same registry and stylesheet cache, so a bundle is fetched once even if referenced by both.

## API Reference

### Registry

| API | Description |
|-----|-------------|
| [registerDesignSystem](#registerdesignsystem) | Registers a design system and its `bundleLoaders` (name → URL). Already-registered names are not overwritten (dev-mode warning). |

### Theme loader

| API | Description |
|-----|-------------|
| [fetchStyleSheet](#fetchstylesheet) | Fetches the URL for a bundle name, builds a `CSSStyleSheet`, caches it, resolves waiters. Deduplicated; default `timeout` 10000 ms. |
| [getLoadedStyleSheet](#getloadedstylesheet) | Returns the cached `CSSStyleSheet`, or `undefined`. |
| [setStyleSheetMapping](#setstylesheetmapping) | Manually caches a `CSSStyleSheet` and resolves waiters. For sheets produced outside `fetchStyleSheet`. |
| [getStyleSheetPromiseInfo](#getstylesheetpromiseinfo) | Low-level: returns/creates the promise for a name. Mostly used internally and in tests. |

## Installation

```bash
npm i @genexus/kasstor-design-system
```

No peer dependencies — pure ESM / DOM logic.

## Quick example

Register once at startup (before any component module evaluates), then let components opt in by bundle name:

```ts
import { registerDesignSystem } from "@genexus/kasstor-design-system";

registerDesignSystem("my-ds", {
  bundleLoaders: {
    "components/button": "/themes/button.css",
    "components/edit":   "/themes/edit.css"
  }
});
```

Then:

```ts
// In a Kasstor component
@Component({
  tag: "my-button",
  sharedDesignSystemStyles: ["components/button"]
})
export class MyButton extends KasstorElement { /* ... */ }
```

```html
<!-- Or globally via kst-theme -->
<kst-theme></kst-theme>
<script type="module">
  document.querySelector("kst-theme").model = ["components/button", "components/edit"];
</script>
```

## registerDesignSystem

```ts
registerDesignSystem(name: string, options: {
  bundleLoaders: Record<string, string /* URL */>;
}): void
```

Registers a design system and its bundle loaders.

- Design-system name is a namespace for the record; **bundle names are global** across all design systems and are what consumers reference.
- **Re-registering the same name is a full no-op**: returns early with a dev-mode warning. The `bundleLoaders` loop is skipped — even new names in the second call are *not* added.
- **Cross-system name collisions are skipped, not overwritten**: when the design-system name is new but a bundle name within already exists, that entry is skipped with a dev-mode warning. Other entries still register.
- If a bundle loader is registered while something is already waiting on it (e.g. a component mounted before registration), the fetch starts immediately.

**Ordering rule**: register every bundle name *before* the component module that references it evaluates. Easiest pattern: a side-effect import at the top of the app entry.

## fetchStyleSheet

```ts
fetchStyleSheet(name: string, timeout?: number): Promise<void> | undefined
```

Resolves the URL for `name`, fetches the CSS, builds a `CSSStyleSheet`, caches it, resolves waiters.

- Default `timeout`: `10000` ms. On timeout, waiters resolve with `styleSheet: undefined` and an error is logged.
- **Deduplicated**: concurrent calls for the same name share one promise.
- Returns `undefined` if no URL is registered yet or a fetch is in flight. A later `registerDesignSystem` that adds the missing URL triggers the fetch lazily (pre-registered waiters are picked up).

## getLoadedStyleSheet

```ts
getLoadedStyleSheet(name: string): CSSStyleSheet | undefined
```

Returns the cached sheet, or `undefined`. Useful for sync "is it ready?" checks before triggering a fetch.

## setStyleSheetMapping

```ts
setStyleSheetMapping(name: string, sheet: CSSStyleSheet): void
```

Caches a sheet manually and resolves pending waiters. For sheets produced outside `fetchStyleSheet` (e.g. build-time inlined CSS turned into a sheet via `replaceSync`).

## getStyleSheetPromiseInfo

```ts
getStyleSheetPromiseInfo(name: string, timeout?: number): {
  promise: Promise<{ name: string; styleSheet: CSSStyleSheet | undefined }>;
  promiseResolver: (value: { name: string; styleSheet: CSSStyleSheet | undefined }) => void;
  isDownloading: boolean;
}
```

Low-level: returns/creates the promise for a name. Used internally; end-user code prefers `fetchStyleSheet` / `getLoadedStyleSheet`.

## Resetting state (tests, HMR)

No public reset API by design. State lives on `globalThis` so tests and HMR boundaries can clear it directly:

```ts
globalThis.geneXusDesignSystemsRegistry?.clear();
globalThis.geneXusDesignSystemsLoaders?.clear();
globalThis.geneXusDesignSystemsStyleSheets?.clear();
globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
```

Importing anything from the package brings the ambient type declarations into scope.

## Subpath exports

Each function is also available individually under `@genexus/kasstor-design-system/<file>.js`: `fetch-style-sheet`, `get-loaded-style-sheet`, `get-style-sheet-promise-info`, `get-style-sheet-url`, `register-design-system`, `set-style-sheet-mapping`. The main entry re-exports all of them **except `getStyleSheetUrl`** — for that one, use the subpath.
