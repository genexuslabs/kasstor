# Component Basics

This page covers the fundamental changes when migrating a component file from StencilJS to Kasstor.

## File Extension

Rename component files from `.tsx` to `.lit.ts`. The `.lit.ts` extension is required for the Vite plugin to apply HMR and build-time analysis.

```
my-button.tsx  →  my-button.lit.ts
```

## Base Class

In StencilJS, components are plain classes. In Kasstor, every component must extend `KasstorElement`:

**StencilJS:**

```tsx
import { Component, h } from "@stencil/core";

@Component({ tag: "my-button", shadow: true })
export class MyButton {
  render() {
    return <button>Click me</button>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "my-button" })
export class MyButton extends KasstorElement {
  override render() {
    return html`<button>Click me</button>`;
  }
}
```

Key differences:

- Import `Component` and `KasstorElement` from `@genexus/kasstor-core/decorators/component.js`.
- Extend `KasstorElement` instead of writing a plain class.
- Use the `override` keyword on `render()` (required when `noImplicitOverride: true` in tsconfig).
- Shadow DOM is enabled by default — no need to specify `shadow: true`.

## The `@Component` Decorator

### StencilJS Options → Kasstor Options

| StencilJS | Kasstor | Notes |
| --- | --- | --- |
| `tag: "my-button"` | `tag: "my-button"` | Same — must contain a hyphen |
| `shadow: true` | _(default)_ | Shadow DOM is on by default in Kasstor |
| `shadow: false` | `shadow: false` | Disables Shadow DOM (not recommended — loses slots and style encapsulation) |
| `shadow: { delegatesFocus: true }` | `shadow: { delegatesFocus: true }` | Same |
| `formAssociated: true` | `shadow: { formAssociated: true }` | Moved inside the `shadow` option |
| `styleUrl: './my-button.css'` | `styles` (imported string) | See [Styles](#styles) below |
| `styleUrls: [...]` | Concatenate imported strings | Import multiple files and concatenate |
| `scoped: true` | Not available | Use Shadow DOM instead |
| `assetsDirs: [...]` | Use Vite's `public/` or `import` | Static assets are handled by Vite |

### Styles

In StencilJS, styles are referenced by file path in the decorator. In Kasstor, styles are imported as a string using Vite's `?inline` suffix:

**StencilJS:**

```tsx
@Component({
  tag: "my-button",
  styleUrl: "./my-button.scss",
  shadow: true
})
```

**Kasstor:**

```ts
import styles from "./my-button.scss?inline";

@Component({
  tag: "my-button",
  styles
})
```

If you have multiple style files, concatenate the imported strings:

```ts
import baseStyles from "./base.scss?inline";
import buttonStyles from "./my-button.scss?inline";

@Component({
  tag: "my-button",
  styles: baseStyles + buttonStyles
})
```

### Global Styles

Kasstor supports `globalStyles` — CSS applied outside the Shadow DOM (useful for styling light DOM children or the host from the outside):

```ts
import globalStyles from "./my-button-global.scss?inline";
import styles from "./my-button.scss?inline";

@Component({
  tag: "my-button",
  styles,
  globalStyles
})
```

Global styles are applied via `adoptedStyleSheets` on connect and removed on disconnect. They are not supported during SSR.

## Removing `@Element()`

In StencilJS, `@Element()` provided access to the host HTML element because `this` pointed to an internal proxy, not the real element.

In Lit/Kasstor, `this` IS the host element. There is no proxy layer. Simply use `this` wherever you previously used `this.el`:

**StencilJS:**

```tsx
import { Component, Element, h } from "@stencil/core";

@Component({ tag: "my-button", shadow: true })
export class MyButton {
  @Element() el!: HTMLMyButtonElement;

  componentDidLoad() {
    console.log(this.el.tagName); // "MY-BUTTON"
    this.el.classList.add("loaded");
  }

  render() {
    return <button>Click me</button>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "my-button" })
export class MyButton extends KasstorElement {
  override firstUpdated() {
    // `this` is the host element
    console.log(this.tagName); // "MY-BUTTON"
    this.classList.add("loaded");
  }

  override render() {
    return html`<button>Click me</button>`;
  }
}
```
