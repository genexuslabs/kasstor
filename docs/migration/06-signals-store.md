# Signals and Store

This page covers migrating from `@stencil/store` to `@genexus/kasstor-signals`.

## Overview

`@stencil/store` provided a simple reactive store for sharing state across components. Kasstor replaces this with **signals** — a fine-grained reactivity primitive that is more efficient and more flexible. Signals are built on [alien-signals](https://github.com/stackblitz/alien-signals).

Key advantages of signals:

- **Fine-grained reactivity:** Only the specific template expressions that read a signal are updated — not the entire component.
- **Composable:** `computed` signals derive state, `effect` runs side effects, `batch` groups updates.
- **No proxy magic:** Signals are explicit getter/setter functions — you always know what is reactive.

## Installation

```bash
npm i @genexus/kasstor-signals
```

## Core Concepts

| API | Description |
| --- | --- |
| `signal(value)` | Creates reactive state. Read: `count()`. Write: `count(5)`. |
| `computed(() => expr)` | Memoized derived value. Lazy — only evaluates when read. |
| `effect(() => { ... })` | Runs immediately and re-runs when dependencies change. Returns a stop function. |
| `batch(() => { ... })` | Defers notifications — dependents update once after the callback. |
| `untrack(() => { ... })` | Reads signals without creating a dependency. |

All imported from `@genexus/kasstor-signals/core.js`.

## Migration Example

### StencilJS with `@stencil/store`

```tsx
// store.ts
import { createStore } from "@stencil/store";

const { state, onChange } = createStore({
  user: null as { name: string } | null,
  theme: "light" as "light" | "dark",
  count: 0
});

onChange("theme", (value) => {
  document.body.setAttribute("data-theme", value);
});

export default state;
```

```tsx
// my-header.tsx
import { Component, h } from "@stencil/core";
import state from "./store";

@Component({ tag: "my-header", shadow: true })
export class MyHeader {
  render() {
    return (
      <header>
        <span>{state.user?.name ?? "Guest"}</span>
        <button onClick={() => { state.theme = state.theme === "light" ? "dark" : "light"; }}>
          Toggle theme
        </button>
        <span>Count: {state.count}</span>
      </header>
    );
  }
}
```

### Kasstor with `@genexus/kasstor-signals`

```ts
// store.ts
import { signal, computed, effect } from "@genexus/kasstor-signals/core.js";

export const user = signal<{ name: string } | null>(null);
export const theme = signal<"light" | "dark">("light");
export const count = signal(0);

// Derived state
export const displayName = computed(() => user()?.name ?? "Guest");

// Side effect — runs when theme changes
effect(() => {
  document.body.setAttribute("data-theme", theme());
});
```

```ts
// my-header.lit.ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";

import { count, displayName, theme } from "./store";

@Component({ tag: "my-header" })
export class MyHeader extends KasstorElement {
  #toggleTheme = () => {
    theme(theme() === "light" ? "dark" : "light");
  };

  override render() {
    return html`
      <header>
        <span>${watch(displayName)}</span>
        <button @click=${this.#toggleTheme}>Toggle theme</button>
        <span>Count: ${watch(count)}</span>
      </header>
    `;
  }
}
```

### Key Differences

| `@stencil/store` | `@genexus/kasstor-signals` |
| --- | --- |
| `state.count` (read) | `count()` (call the signal) |
| `state.count = 5` (write) | `count(5)` (call with a value) |
| `onChange("prop", cb)` | `effect(() => { prop(); /* side effect */ })` |
| Proxy-based — reads/writes look like plain objects | Explicit getter/setter functions |
| Re-renders the entire component | Only updates the `watch()`-wrapped template parts |

## The `watch` Directive

The `watch` directive is **essential** for connecting signals to Lit templates. Without `watch`, template parts will not update when signals change.

```ts
import { watch } from "@genexus/kasstor-signals/directives/watch.js";

// Correct: template updates when count changes
html`<span>${watch(count)}</span>`

// Wrong: renders the initial value and never updates
html`<span>${count()}</span>`
```

`watch` works with both `signal` and `computed` values.

## `@SignalProp` Decorator

For component properties backed by signals, Kasstor provides `@SignalProp`. This turns a class property into a signal internally, allowing you to use it in both the component API (as a normal property) and in signal-based expressions (`computed`, `effect`, `watch`).

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
import { html } from "lit";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import type { KasstorSignalState } from "@genexus/kasstor-signals";

@Component({ tag: "app-counter" })
export class AppCounter extends KasstorElement {
  // Declare the underlying signal type
  declare $count: KasstorSignalState<AppCounter["count"]>;

  @SignalProp count: number = 0;

  #increment = () => { this.count++; };

  override render() {
    // Use watch with the $ signal for pin-point updates
    return html`
      <button @click=${this.#increment}>+</button>
      <span>${watch(this.$count)}</span>
    `;
  }
}
```

- Read/write via `this.count` as a normal property.
- Use `this.$count` to get the raw signal (for `watch`, `computed`, `effect`, etc.).
- `@SignalProp` does **not** trigger Lit re-renders — use `watch(this.$count)` in the template.

## Triggering Full Component Updates from Signals

If you need a signal change to trigger a full Lit re-render (instead of pin-point updates via `watch`), use `effect` + `requestUpdate`:

```ts
override connectedCallback() {
  super.connectedCallback();

  this.#stopEffect = effect(() => {
    someGlobalSignal(); // Track the signal
    this.requestUpdate(); // Trigger a full re-render
  });
}

override disconnectedCallback() {
  this.#stopEffect?.();
  super.disconnectedCallback();
}
```

---

**Next:** [Testing](./07-testing.md)
