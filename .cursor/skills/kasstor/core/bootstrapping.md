# Bootstrapping — @genexus/kasstor-core

Bootstrapping APIs let library authors register custom element **loaders** so that components can be loaded on demand (e.g. when they appear in a template) instead of only via direct import.

## registerCustomElementLoaders

Registers a set of custom element loaders for a library. Each loader is a function that returns a Promise (typically a dynamic `import()` of the component class). When a tag is used in the DOM (e.g. via the **`lazyLoad`** directive), the corresponding loader is run and the element is defined. This enables declarative lazy loading: components are loaded only when they are attached, improving initial load time.

**Use case:** You are building a component library (or an app) and want to support lazy loading. Call `registerCustomElementLoaders` once at startup with a map of tag names to **`CustomElementInfo`** (loader + optional `dependencies`); then any template can use `<my-panel ${lazyLoad()}></my-panel>` and the panel will be loaded when it is rendered.

### How it works

- **Single global registry:** The first call initializes a global registry (and a mutation observer). Later calls add or skip loaders based on prefix and tag.
- **Library prefix:** All tag names in `customElements` must start with `libraryPrefix` (e.g. `my-`). The prefix identifies the library and avoids collisions; if the prefix is already registered by another library, the whole call is skipped and a warning is logged.
- **Per-tag registration:** For each tag in `customElements`, if that tag is not yet registered, the loader and `dependencies` (or the default) are stored. If the tag was already registered by another library, it is skipped and a warning is logged.
- **Default for `dependencies`:** If an entry omits `dependencies`, `defaultCustomElementWatchingBehavior` is used (either `"never-observe"` or `"always-observe"`).
- **Already-attached elements:** If elements with one of the new tags are already in the DOM (e.g. rendered before this call), their loaders are run so those elements get defined.
- **When `lazyLoad` runs:** When an element with a registered tag is attached (e.g. Lit renders `<my-panel ${lazyLoad()}></my-panel>`), the runtime looks up the loader for that tag, runs it once, waits for the Promise, defines the custom element, and the component then renders. If the element was already defined (e.g. by a direct import), the loader is not run.

### Options (`LibraryLoaderOptions<Prefix>`)

- **`libraryName`** — Human-readable name for the library (used in warnings).
- **`libraryPrefix`** — Prefix shared by all tags (e.g. `"my-"`). Type: `LibraryPrefix` (string ending with `-`).
- **`defaultCustomElementWatchingBehavior`** — Default for entries that do not set `dependencies`: `"never-observe"` or `"always-observe"`.
- **`customElements`** — Record of tag name → **`CustomElementInfo`** (see below). Tag names must extend the prefix (e.g. `"my-panel"`, `"my-dashboard"`).

### CustomElementInfo<TagName>

Each entry in `customElements` must conform to this type:

```ts
export type CustomElementInfo<TagName extends string> = {
  /** Returns a Promise that resolves when the custom element is defined. */
  loader: () => Promise<unknown>;

  /**
   * Include the dependencies of your library's custom element tag.
   *
   *  - `"never-observe"`: The custom element doesn't have any dependencies.
   *
   *  - `"always-observe"`: The custom element will always be observed for
   *    mutations in its Shadow Root.
   *
   *  - When you specify an array of dependencies (tag names), the custom
   *    element will be observed until all its dependencies are defined.
   */
  dependencies?: CustomElementDependencies<TagName>;
};
```

### Example

```ts
import { registerCustomElementLoaders } from "@genexus/kasstor-core/bootstrapping/register-custom-element-loaders.js";

registerCustomElementLoaders({
  libraryName: "My Library",
  libraryPrefix: "my-",
  defaultCustomElementWatchingBehavior: "never-observe",
  customElements: {
    "my-panel": {
      loader: () => import("./components/my-panel.js")
    },
    "my-dashboard": {
      loader: () => import("./components/my-dashboard.js"),
      dependencies: "always-observe"
    }
  }
});
```

After this, templates can use `<my-panel ${lazyLoad()}></my-panel>` and the panel will be loaded when it is attached to the DOM.

### Conflicts

- If **`libraryPrefix`** is already in use by another library, the entire call is skipped and a warning is logged.
- If a **tag** is already registered by another library, that tag is skipped and a warning is logged; other tags in the same call are still registered.
