# Lifecycle

This page maps StencilJS lifecycle methods to their Lit/Kasstor equivalents, highlights behavioral differences, and explains Kasstor-specific additions.

## Lifecycle Mapping

### StencilJS First Render

```
connectedCallback → componentWillLoad → componentWillRender → render → componentDidRender → componentDidLoad
```

### Kasstor/Lit First Render

```
connectedCallback → scheduleUpdate → @Observe callbacks → firstWillUpdate → shouldUpdate → willUpdate → render → firstUpdated → updated → updateComplete
```

### StencilJS Subsequent Updates

```
componentShouldUpdate → componentWillUpdate → componentWillRender → render → componentDidRender → componentDidUpdate
```

### Kasstor/Lit Subsequent Updates

```
scheduleUpdate → @Observe callbacks → shouldUpdate → willUpdate → render → updated → updateComplete
```

## Mapping Table

| StencilJS                 | Kasstor / Lit                              | Key Differences                                                                                                                          |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `connectedCallback()`     | `override connectedCallback()`             | **Must call `super.connectedCallback()`** at the start                                                                                   |
| `disconnectedCallback()`  | `override disconnectedCallback()`          | **Must call `super.disconnectedCallback()`** at the end                                                                                  |
| `componentWillLoad()`     | `protected override firstWillUpdate()`     | Kasstor's `firstWillUpdate` is SSR-safe and runs once before the first render. Setting properties here does not trigger an extra update. |
| `componentDidLoad()`      | `override firstUpdated()`                  | Runs once after the first render. DOM is available. Setting properties here triggers a new update.                                       |
| `componentWillRender()`   | `override willUpdate(changedProperties)`   | Runs before every render (including the first). Receives a `PropertyValues` map.                                                         |
| `componentDidRender()`    | `override updated(changedProperties)`      | Runs after every render. Receives a `PropertyValues` map.                                                                                |
| `componentWillUpdate()`   | `override willUpdate(changedProperties)`   | Same as `componentWillRender`. In Stencil these were separate; in Lit they are the same hook.                                            |
| `componentDidUpdate()`    | `override updated(changedProperties)`      | Same as `componentDidRender`.                                                                                                            |
| `componentShouldUpdate()` | `override shouldUpdate(changedProperties)` | Return `false` to skip the render. In Stencil this only runs on re-renders; in Lit it runs on **every** update including the first.      |
| _(no equivalent)_         | `protected override scheduleUpdate()`      | Controls when the update runs. Kasstor overrides it to reduce Total Blocking Time. Must `await super.scheduleUpdate()`.                  |
| _(no equivalent)_         | `updateComplete`                           | Promise that resolves when the update cycle finishes. Useful in tests: `await el.updateComplete`.                                        |

## When to Call `super`

Not all overrides require `super`. Kasstor injects its internal hooks (`@Observe` callbacks, `firstWillUpdate`) via monkey-patching in the constructor, so `willUpdate` and `updated` are safe to override without calling `super` — their base implementations in `LitElement` are no-ops.

`connectedCallback` and `disconnectedCallback` are the exception: they do real work in `LitElement` and **must** call `super`.

```ts
// connectedCallback: call super FIRST
override connectedCallback() {
  super.connectedCallback();
  // Your logic here
}

// disconnectedCallback: call super LAST
override disconnectedCallback() {
  // Your cleanup here
  super.disconnectedCallback();
}

// willUpdate and updated: super not required (base is a no-op)
override willUpdate(changedProperties: PropertyValues) {
  // Your logic here
}

override updated(changedProperties: PropertyValues) {
  // Your logic here
}

// WRONG — breaks the component
override connectedCallback() {
  // Missing super.connectedCallback()!
  this.setup();
}
```

## `firstWillUpdate` (Kasstor-specific)

`firstWillUpdate` is added by `KasstorElement` and does not exist in plain Lit. It runs **once** before the first `willUpdate` and is the closest equivalent to Stencil's `componentWillLoad`.

- SSR-safe: works during server-side rendering.
- Setting properties inside `firstWillUpdate` does **not** trigger an extra update cycle.
- `@Observe` callbacks fire before `firstWillUpdate`.

```ts
protected override firstWillUpdate(): void {
  // One-time setup before the first render. No need to call super.firstWillUpdate()
  this.#uniqueId = `${this.tagName.toLowerCase()}-${crypto.randomUUID()}`;
}
```

## `scheduleUpdate` — Controlling Update Timing

`KasstorElement` already overrides `scheduleUpdate()` internally to optimize render performance (reduces Total Blocking Time when many components mount at once). **You do not need to override it** for performance reasons — Kasstor handles this automatically.

You only need to override `scheduleUpdate()` in advanced cases where you need to defer the update for a specific domain reason (e.g., synchronizing with an external animation loop). If you do, **you must `await super.scheduleUpdate()`** to preserve Kasstor's optimizations and ensure the update proceeds:

```ts
@Component({ tag: "my-element" })
export class MyElement extends KasstorElement {
  protected override async scheduleUpdate(): Promise<void> {
    await super.scheduleUpdate();
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
}
```

> **Important:** Forgetting to call `await super.scheduleUpdate()` will prevent the component from rendering.

## Complete Lifecycle Example

### StencilJS

```tsx
import { Component, Element, Prop, State, Watch, h } from "@stencil/core";

@Component({ tag: "my-panel", shadow: true, styleUrl: "my-panel.css" })
export class MyPanel {
  @Element() el!: HTMLElement;

  @Prop() title: string = "Panel";
  @Prop({ mutable: true }) collapsed: boolean = false;

  @State() contentHeight: number = 0;

  // Does NOT fire on initial value
  @Watch("collapsed")
  onCollapsedChanged(newValue: boolean) {
    this.contentHeight = newValue ? 0 : this.calculateHeight();
  }

  // Must duplicate initialization logic
  connectedCallback() {
    this.contentHeight = this.collapsed ? 0 : this.calculateHeight();
  }

  componentWillLoad() {
    // Runs once before first render (async allowed)
    console.log("Will load");
  }

  componentWillRender() {
    // Runs before every render
    console.log("Will render");
  }

  componentDidLoad() {
    // Runs once after first render — DOM is ready
    console.log("Did load:", this.el.offsetHeight);
  }

  componentDidRender() {
    // Runs after every render
    console.log("Did render");
  }

  private calculateHeight(): number {
    return 200;
  }

  render() {
    return (
      <div>
        <h2 onClick={() => (this.collapsed = !this.collapsed)}>{this.title}</h2>
        <div style={{ height: `${this.contentHeight}px`, overflow: "hidden" }}>
          <slot />
        </div>
      </div>
    );
  }
}
```

### Kasstor

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Observe } from "@genexus/kasstor-core/decorators/observe.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";
import { styleMap } from "lit/directives/style-map.js";

import styles from "./my-panel.scss?inline";

@Component({ tag: "my-panel", styles })
export class MyPanel extends KasstorElement {
  @property() title: string = "Panel";
  @property({ type: Boolean }) collapsed: boolean = false;

  @state() private contentHeight: number = 0;

  // Fires on the initial value AND on subsequent changes — no duplication needed
  @Observe("collapsed")
  protected onCollapsedChanged(newValue?: unknown) {
    this.contentHeight = (newValue as boolean) ? 0 : this.#calculateHeight();
  }

  protected override firstWillUpdate(): void {
    // Runs once before first render (replaces componentWillLoad)
    console.log("First will update");
  }

  override willUpdate(changedProperties: PropertyValues): void {
    // Runs before every render (replaces componentWillRender / componentWillUpdate)
    console.log("Will update");
  }

  override firstUpdated(): void {
    // Runs once after first render — DOM is ready (replaces componentDidLoad)
    // `this` is the host element — no need for @Element
    console.log("First updated:", this.offsetHeight);
  }

  override updated(changedProperties: PropertyValues): void {
    // Runs after every render (replaces componentDidRender / componentDidUpdate)
    console.log("Updated");
  }

  #calculateHeight(): number {
    return 200;
  }

  #toggleCollapsed = () => {
    this.collapsed = !this.collapsed;
  };

  override render() {
    const contentStyles = styleMap({
      height: `${this.contentHeight}px`,
      overflow: "hidden"
    });

    return html`
      <div>
        <h2 @click=${this.#toggleCollapsed}>${this.title}</h2>
        <div style=${contentStyles}>
          <slot></slot>
        </div>
      </div>
    `;
  }
}
```

## Key Behavioral Differences

1. **`@Observe` fires before the first render.** Unlike Stencil's `@Watch`, you do not need to duplicate logic in `connectedCallback` for initialization.

2. **Setting properties in `firstWillUpdate` does not trigger an extra update.** In Lit's `firstUpdated`, setting a property triggers another render cycle. Use `firstWillUpdate` for initialization that should not cause a double render.

3. **`willUpdate` and `updated` receive `changedProperties`.** This `PropertyValues` map lets you check which properties changed: `changedProperties.has("title")`. Stencil's `componentShouldUpdate` received `(newValue, oldValue, propName)`.

4. **`connectedCallback` and `disconnectedCallback` must call `super`** — they do real work in `LitElement`. `willUpdate` and `updated` do not require `super` (their base implementations are no-ops). This is the most common migration mistake: Stencil's lifecycle methods were standalone hooks; in Kasstor, `connectedCallback`/`disconnectedCallback` are real overrides that must chain up.

---

**Next:** [Templates](./05-templates.md)
