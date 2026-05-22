# `kst-theme` — Usage

## Table of Contents

- [Basic Usage](#basic-usage)
- [Loading Multiple Bundles](#loading-multiple-bundles)
- [FOUC Prevention](#fouc-prevention)
- [Do's and Don'ts](#dos-and-donts)

## Basic Usage

Themes are loaded by name. Before using `kst-theme`, register a design
system that maps each bundle name to a URL.

```ts
import { registerDesignSystem } from "@genexus/kasstor-design-system";
import "@genexus/kasstor-core/components/theme.js";

registerDesignSystem("my-app", {
  bundleLoaders: {
    "my-app-theme": "/themes/my-app-theme.css"
  }
});
```

```html
<kst-theme></kst-theme>

<div class="themed-content">
  <h1>Hello, themed world!</h1>
</div>
```

```js
const theme = document.querySelector("kst-theme");
theme.model = "my-app-theme";

theme.addEventListener("themeLoaded", event => {
  console.log("Loaded:", event.detail.success); // ["my-app-theme"]
  console.log("Failed:", event.detail.failed);  // []
});
```

### Key Points

- The `model` property accepts a single theme name, an array of names, a
  `ThemeItemModel` object (`{ name, attachStyleSheet? }`), or an array of those.
- Theme names are resolved against the global registry built with
  `registerDesignSystem`. Unknown names will eventually time out
  (default: 10 s).
- The `themeLoaded` event fires once every theme in `model` has either loaded
  or failed.
- Loaded stylesheets are adopted into the nearest `Document` or `ShadowRoot`
  via `adoptedStyleSheets`. Multiple `kst-theme` elements that reference the
  same name share a single `CSSStyleSheet` instance.

## Loading Multiple Bundles

Use the `getBundles` helper to turn a list of names into a `ThemeItemModel[]`.

```ts
import { getBundles } from "@genexus/kasstor-core";
import { registerDesignSystem } from "@genexus/kasstor-design-system";
import "@genexus/kasstor-core/components/theme.js";

registerDesignSystem("my-app", {
  bundleLoaders: {
    "base-tokens": "/themes/tokens.css",
    "component-styles": "/themes/components.css",
    "dark-mode": "/themes/dark.css"
  }
});

const theme = document.querySelector("kst-theme");
theme.model = getBundles(["base-tokens", "component-styles", "dark-mode"]);

theme.addEventListener("themeLoaded", event => {
  console.log("Successfully loaded:", event.detail.success);
  console.log("Failed:", event.detail.failed);
});
```

### Key Points

- A failing theme does not prevent the others from loading.
- Failed theme names are listed under `event.detail.failed`.
- Each item can opt out of attachment with `{ name: "x", attachStyleSheet: false }`
  — the bundle will still be fetched and cached, but not adopted into the root.
- `attachStyleSheetsDisabled` toggles attachment for all items at once. It is
  reactive: setting it to `true` detaches the already-loaded sheets without
  re-fetching, and setting it back to `false` re-attaches them.

## FOUC Prevention

By default, `kst-theme` injects an inline `<style>` element that hides any
ancestor of the loading `kst-theme` until every theme in `model` has
resolved.

```html
<kst-theme></kst-theme>

<!-- This content is hidden (visibility: hidden) until the themes load -->
<main>
  <h1>Welcome</h1>
</main>
```

```js
document.querySelector("kst-theme").model = "my-app-theme";
```

Disable the behavior when initial unstyled content is acceptable (e.g., when
the themes are expected to be cached):

```html
<kst-theme avoid-flash-of-unstyled-content-disabled></kst-theme>
```

### Key Points

- The injected rule is `:host,:has(>kst-theme[data-kst-theme-loading]) { visibility: hidden !important }`.
  The `data-kst-theme-loading` attribute is automatically removed once
  loading completes.
- The `:has` selector hides whichever element contains the `kst-theme` as a
  direct child (typically the document body or a layout container).
- FOUC prevention is a startup-time behavior: the inline style is only present
  while themes are loading.

## Do's and Don'ts

### Do

- Set `model` from JavaScript when passing arrays or objects.
- Register every theme via `registerDesignSystem` before mounting a
  `kst-theme` that references it.
- Subscribe to `themeLoaded` for both success and failure: failed themes are
  reported but do not throw.

### Don't

- Don't try to load themes by URL or by inline `CSSStyleSheet` from the
  `model` directly — only name resolution against the registry is supported.
- Don't manipulate the component's children directly; everything except the
  optional FOUC `<style>` is structural.
- Don't reuse a theme name across multiple design systems with different
  URLs — the first registration wins and a warning is emitted in development.
