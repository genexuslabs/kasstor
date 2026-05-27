# Components — @genexus/kasstor-core

Built-in custom elements and helpers.

## kst-theme

Loads named CSS bundles from the design-system registry and adopts them into the nearest `Document` or `ShadowRoot` via `adoptedStyleSheets`. Resolves names against the registry created with [`registerDesignSystem`](../../design-system/README.md).

Side-effect import registers the tag:

```ts
import "@genexus/kasstor-core/components/theme.js";
```

### Minimal example

```ts
import { registerDesignSystem } from "@genexus/kasstor-design-system";
import "@genexus/kasstor-core/components/theme.js";

registerDesignSystem("my-app", {
  bundleLoaders: { "my-app-theme": "/themes/my-app-theme.css" }
});
```

```html
<kst-theme></kst-theme>
<main>Hello, themed world.</main>
```

```js
const theme = document.querySelector("kst-theme");
theme.model = "my-app-theme";

theme.addEventListener("themeLoaded", e => {
  console.log(e.detail.success); // ["my-app-theme"]
  console.log(e.detail.failed);  // []
});
```

### Properties

- **`model: ThemeModel | undefined | null`** — Theme name, array of names, `ThemeItemModel` (`{ name, attachStyleSheet? }`), or array of those. Resolved against the registry; unknown names time out (default 10 s). **Only the first non-null assignment is processed** (not reactive).
- **`attachStyleSheetsDisabled: boolean`** (default `false`) — Toggles attachment of loaded sheets at runtime. Reactive: `true` detaches without re-fetching; `false` re-attaches. Per-item override via `ThemeItemModel.attachStyleSheet`.
- **`avoidFlashOfUnstyledContentDisabled: boolean`** (default `false`) — When `false`, injects an inline `<style>` that hides the loading `kst-theme`'s parent (via `:has`) until every theme in `model` resolves.

### Event

- **`themeLoaded: CustomEvent<{ success: string[]; failed: string[] }>`** — Fires once every theme has loaded or failed. Bubbles, **not composed** (does not cross shadow DOM).

### Notes

- `kst-theme` renders nothing visible (light DOM, `display: contents`). Don't style the `kst-theme` element directly — style the surrounding content through the loaded themes.
- Multiple `kst-theme` elements that reference the same name share a single `CSSStyleSheet` instance (deduplicated through the design-system loader cache).
- A failing theme does not block others.
- Sheets attach to the **root containing the element**: inside a `ShadowRoot`, that `ShadowRoot`; otherwise the document.

For multi-bundle loading, anti-patterns, and FOUC details see:
- [Usage](../src/components/theme/docs/usage.md)
- [Styling](../src/components/theme/docs/styling.md)

## getBundles

Normalizes a list of names (or `ThemeItemModel` items) into a `ThemeItemModel[]` for `kst-theme`'s `model`. Exported from the package root.

```ts
import { getBundles } from "@genexus/kasstor-core";

theme.model = getBundles([
  "base-tokens",
  { name: "component-styles", attachStyleSheet: false }
]);
```

### Signature

```ts
const getBundles: <Bundle extends string>(
  bundles: (Bundle | { name: Bundle; attachStyleSheet?: boolean })[]
) => ThemeItemModel[];
```
