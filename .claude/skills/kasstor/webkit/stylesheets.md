# Stylesheets — @genexus/kasstor-webkit

Adopt `CSSStyleSheet` instances into a `Document`/`ShadowRoot` with **shared reference counting**, so multiple consumers can request the same sheet without duplicating it.

```ts
import {
  addStyleSheet, removeStyleSheet,
  addGlobalStyleSheet, removeGlobalStyleSheet
} from "@genexus/kasstor-webkit/stylesheets.js";
```

## Overview

Two entry points share the same per-`(root, sheet)` counter:

- **`addStyleSheet` / `removeStyleSheet`** — explicit node (`Document`/`ShadowRoot`). One call = one reference; caller balances them.
- **`addGlobalStyleSheet` / `removeGlobalStyleSheet`** — element-based. Resolves the containing root via `getRootNode()`; idempotent per `(element, sheet)` pair (a re-fired `connectedCallback` does not inflate the count).

The sheet is physically pushed onto `node.adoptedStyleSheets` on the **0 → 1** transition and removed on **1 → 0** regardless of which API caused it. Bookkeeping uses `WeakMap`/`WeakSet`, so entries are GC'd with their keys.

## addStyleSheet

```ts
addStyleSheet(node: Document | ShadowRoot, stylesheet: CSSStyleSheet): void
```

Adopts `stylesheet` into `node`. First reference physically inserts it; subsequent calls bump the counter. Safe to mix with `addGlobalStyleSheet` on the same pair. Each call must be paired with a `removeStyleSheet`.

## removeStyleSheet

```ts
removeStyleSheet(node: Document | ShadowRoot, stylesheet: CSSStyleSheet): void
```

Releases one reference. Physically removes the sheet on the last reference. No-op if no outstanding references — safe to call defensively.

## addGlobalStyleSheet

```ts
addGlobalStyleSheet(element: HTMLElement, stylesheet: CSSStyleSheet): void
```

Adopts `stylesheet` into the root currently containing `element`. Use when the component doesn't know upfront if it lives in the document or in a shadow root.

- **Idempotent** per `(element, stylesheet)` — re-fired `connectedCallback` is harmless.
- **Detached element**: if `getRootNode()` doesn't return a `Document`/`ShadowRoot`, the call is a no-op.
- **Root is snapshotted** on add for cleanup. Required because inside `disconnectedCallback`, `element.getRootNode()` returns the element itself.
- Pair with `removeGlobalStyleSheet` in `disconnectedCallback`.

## removeGlobalStyleSheet

```ts
removeGlobalStyleSheet(element: HTMLElement, stylesheet: CSSStyleSheet): void
```

Releases the reference held by `element`. Physically removes the sheet only when no other reference remains (including `addStyleSheet` references). No-op for unregistered pairs.

## Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import {
  addGlobalStyleSheet, removeGlobalStyleSheet
} from "@genexus/kasstor-webkit/stylesheets.js";
import { html } from "lit";

const customScrollbar = new CSSStyleSheet();
customScrollbar.replaceSync(`body::-webkit-scrollbar { width: 12px }`);

@Component({ tag: "app-page", shadow: false })
export class AppPage extends KasstorElement {
  override connectedCallback() {
    super.connectedCallback();
    addGlobalStyleSheet(this, customScrollbar);
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    removeGlobalStyleSheet(this, customScrollbar);
  }
  override render() { return html`<slot></slot>`; }
}
```

Two `app-page` instances share a single adoption (ref-counted); the sheet detaches only when the last one disconnects.

## Relationship to `@Component`

The decorator already uses these helpers internally:

- `globalStyles` — adopted via `addGlobalStyleSheet`, released on `disconnectedCallback`.
- `sharedDesignSystemStyles` for light DOM (`shadow: false`) — same path. Shadow DOM components push directly onto `renderRoot.adoptedStyleSheets`.

You typically only call these helpers when authoring tooling, base classes, or non-`@Component` elements that need the same lifecycle.
