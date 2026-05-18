# `kst-theme` — Styling

## Table of Contents

- [Overview](#overview)
- [FOUC Prevention](#fouc-prevention)
- [Anti-patterns](#anti-patterns)
- [Do's and Don'ts](#dos-and-donts)

## Overview

The `kst-theme` component does not render visible content and does not use
Shadow DOM. It loads `CSSStyleSheet` objects (resolved from the global
registry) and adopts them into the nearest `Document` or `ShadowRoot` via the
`adoptedStyleSheets` API. The host element renders with `display: contents`
and adopts a small SCSS file with that single rule.

Because `kst-theme` produces no visual output, it has no CSS custom
properties, shadow parts, or styling hooks. Style the surrounding content
through the loaded themes themselves.

## FOUC Prevention

When `avoidFlashOfUnstyledContentDisabled` is `false` (the default), the
component renders an inline `<style>` element while themes are loading:

```css
:host,
:has(> kst-theme[data-kst-theme-loading]) {
  visibility: hidden !important;
}
```

Because the component uses light DOM, the `<style>` element is part of the
document and its rules are document-scoped. The `:has` selector matches the
parent of any `kst-theme` that still has the `data-kst-theme-loading`
attribute. Once every theme in `model` has loaded (or failed) the attribute
is removed and the rendered `<style>` is replaced by `nothing`.

To disable the behavior (e.g., when themes are expected to be cached):

```html
<kst-theme avoid-flash-of-unstyled-content-disabled></kst-theme>
```

## Anti-patterns

### 1. Applying CSS classes or styles directly to `kst-theme`

```css
/* INCORRECT — kst-theme has display: contents and renders no visible content. */
kst-theme {
  background-color: blue;
}
```

Style the elements inside the themed root instead.

### 2. Nesting `kst-theme` inside a Shadow DOM without understanding scope

The component attaches stylesheets to the root node where it is connected. If
placed inside a Shadow DOM, sheets are attached to that `ShadowRoot`, not the
document. This is intentional but can be surprising if you expect
document-level theming.

```html
<!-- Attaches to the document -->
<body>
  <kst-theme></kst-theme>
</body>

<!-- Attaches to the shadow root of my-component -->
<my-component>
  #shadow-root
  <kst-theme></kst-theme>
</my-component>
```

## Do's and Don'ts

### Do

- Style the surrounding content via the loaded themes — that is the whole
  point of the registry.
- Co-locate `kst-theme` at the same root where its sheets need to apply
  (document body for global themes, the shadow root of a component for scoped
  themes).
- Test the FOUC behavior with throttled network or empty cache to ensure the
  loading state is short enough.

### Don't

- Don't add visual rules targeting `kst-theme` itself.
- Don't load the same bundle name from two different design systems with
  different URLs — the first registration wins.
- Don't rely on `kst-theme` to scope or filter rules; the loaded sheets are
  applied as-is to the root.
