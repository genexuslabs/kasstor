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
export type CustomElementExplicitDependencies<ElementItself = string> = Exclude<
  CustomElementTagNames | (string & {}),
  // Exclude the tag itself, as it is not a dependency
  ElementItself
>[];

export type CustomElementDependencies<ElementItself = string> =
  | CustomElementExplicitDependencies<ElementItself>
  | "never-observe"
  | "always-observe";

/**
 * Describes how to load a single custom element and how to observe its
 * Shadow DOM for nested custom elements. Used as the value type for each
 * entry in `LibraryLoaderOptions.customElements`.
 *
 * - **loader** — Required. Invoked when the element is first needed (e.g. by
 *   `lazyLoad`); must return a Promise that resolves when the component is
 *   defined. Typically `() => import("./my-panel.js")`. Cached per tag.
 * - **dependencies** — Optional. Controls Shadow DOM observation for nested
 *   tags: `"never-observe"` (default for many), `"always-observe"`, or an
 *   array of tag names. Omitted entries use the library's
 *   `defaultCustomElementWatchingBehavior`.
 */
export type CustomElementInfo<TagName extends string> = {
  /** Returns a Promise that resolves when the custom element is defined. */
  loader: () => Promise<unknown>;

  /**
   * Include the dependencies of your library's custom element tag.
   *
   * This property is important to **optimize** the render performance of
   * your library, by avoid observing mutations in custom elements that
   * don't use any other custom element, or where its dependencies are
   * already defined.
   *
   *  - `"never-observe"`: It means that the custom element doesn't have
   *    any dependencies, so it will not be observed for mutations in its
   *    Shadow Root.
   *
   *  - `"always-observe"`: The custom element will **always** be observed
   *    for mutations in its Shadow Root.
   *
   *  - When you specify an array of dependencies (tag names), it means
   *    that the custom element will be observed for mutations in its
   *    shadow root until all its dependencies are defined.
   *
   *    This is least common case, as most custom elements know their
   *    dependencies. This case can happen if you let customize the
   *    internal render of your custom element with a property that
   *    redefines the render. This is the case for the Chameleon's
   *    `ch-chat`, the internal render of messages can be customized with
   *    the `renderItem` function, so we can avoid observing that custom
   *    element.
   *
   *    **IMPORTANT!!**: Try to avoid this case, as it can lead to
   *    performance issues, because the custom element will always be
   *    observed for DOM mutations.
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
