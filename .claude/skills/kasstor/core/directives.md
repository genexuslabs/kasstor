# Directives — @genexus/kasstor-core

Directives are functions you use inside Lit templates to control how or when content is rendered. Kasstor provides a small set of directives that integrate with its component model and with SSR: they are designed to work with `KasstorElement` and to play well with server-side rendering and hydration. Each directive is imported from its own path under `@genexus/kasstor-core/directives/`.

## lazyLoad

The `lazyLoad` directive automatically loads a component when it is attached to the DOM. It helps improve initial load time by loading components on demand.

**Requirement:** The component's tag must be registered via **`registerCustomElementLoaders`** (see [bootstrapping.md](bootstrapping.md)). The library (or app) calls `registerCustomElementLoaders` at startup with loaders for each tag; `lazyLoad` then uses those loaders when the element is attached.

### Features

- Loads the component when the element is attached to the DOM; if the component is already registered, it is used immediately.
- Can only be used in an **ElementPart**: it must be placed on the custom element tag (e.g. `<my-component ${lazyLoad()}></my-component>`).
- Only works with components whose tags are registered via `registerCustomElementLoaders` (and that extend `KasstorElement`).

### Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { lazyLoad } from "@genexus/kasstor-core/directives/lazy-load.js";
import { html } from "lit";

/**
 * Root app component that lazy-loads the dashboard.
 * @access public
 */
@Component({ tag: "my-app" })
export class MyApp extends KasstorElement {
  override render() {
    return html`
      <my-header></my-header>
      <my-dashboard ${lazyLoad()}></my-dashboard>
      <my-footer></my-footer>
    `;
  }
}
```

### Usage

- **Syntax:** `lazyLoad()` with no arguments, on the element's attribute position.
- **Restriction:** Using it in any other part type (e.g. `${lazyLoad()}` inside node content) will throw at runtime, indicating it can only be used in an ElementPart.

## renderByPlatform

The `renderByPlatform` directive renders content based on the current platform (browser or server).

### Features

- Server: renders `serverValue`; browser: renders `browserValue`. If `serverValue` is omitted, the server renders nothing for that expression (useful for browser-only content).
- During hydration, keeps the server value until the first update, then switches to the browser value (avoids mismatch).
- Only works when the template is rendered by a `KasstorElement` (needs host for hydration).

### Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { renderByPlatform } from "@genexus/kasstor-core/directives/render-by-platform.js";
import { html } from "lit";

/**
 * Renders different content on server vs browser using renderByPlatform.
 * @access public
 */
@Component({ tag: "my-render-by-platform-example" })
export class MyRenderByPlatformExample extends KasstorElement {
  override render() {
    return html`
      <h1>${renderByPlatform("Browser only", "Server only")}</h1>
      <p>${renderByPlatform("Client-only text")}</p>
    `;
  }
}
```

In the second line, only the browser will render "Client-only text"; the server renders nothing there. Use this for client-only UI or when the content depends on `window` or other browser APIs.

### Restrictions

- Must be used in a template rendered by a `KasstorElement` (the directive needs the host for hydration). Using it in a standalone template may break hydration.

### Signature

- `renderByPlatform(browserValue, serverValue?)`: `browserValue` is shown on the client; `serverValue` on the server. If `serverValue` is omitted, the server renders nothing there (browser-only content).
