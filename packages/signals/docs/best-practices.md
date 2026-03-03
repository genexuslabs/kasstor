# Best Practices — @genexus/kasstor-signals

## Signal Organization

Create a signals store for shared state:

```ts
// signals/app-store.ts
import { signal, computed, effect } from "@genexus/kasstor-signals/core.js";

export interface User {
  id: string;
  name: string;
  email: string;
}

// State signals
export const user = signal<User | null>(null);
export const isLoading = signal(false);
export const error = signal<string | null>(null);

// Computed signals
export const isAuthenticated = computed(() => user() !== null);
export const displayName = computed(() => user()?.name ?? "Guest");

// Side effects
effect(() => {
  if (user()) {
    localStorage.setItem("user", JSON.stringify(user()));
  }
});
```

## Using the Store in Components

When a component reads signals from a store in its template, the component must subscribe so it re-renders when those signals change. Either use **`watch`** for each signal in the template (pin-point updates) or run an **`effect`** that reads the signals and calls **`this.requestUpdate()`** so the whole component updates. Use **`connectedCallback`** to start the effect and **`disconnectedCallback`** to stop it (so the effect is cleaned up when the element is removed and re-created when it is re-inserted, e.g. when moved in the DOM). The effect is not auto-disposed by the library—you must call the returned stop function.

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { effect } from "@genexus/kasstor-signals/core/effect.js";
import { displayName, isLoading } from "../signals/app-store.js";
import { html } from "lit";

/**
 * Header that subscribes to store signals via effect and requestUpdate.
 * @access public
 */
@Component({ tag: "app-header" })
export class AppHeader extends KasstorElement {
  #stopEffect?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopEffect = effect(() => {
      isLoading();
      displayName();
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopEffect?.();
  }

  override render() {
    return html`
      <header>
        ${isLoading() ? html`<p>Loading...</p>` : html`<h1>Welcome ${displayName()}</h1>`}
      </header>
    `;
  }
}
```

## Avoid Over-Tracking

Use `untrack` when you read a signal for display (or side effect) but don't want changes to that signal to trigger a re-run. The computed or effect should have at least one tracked dependency so it can update when needed; use `untrack` only on the reads you want to exclude.

```ts
const itemCount = signal(0);
const logLevel = signal("info");

// ✗ Bad: Re-runs when either changes; if we only care about itemCount, we over-track
const display = computed(() => {
  const count = itemCount();
  const level = logLevel();
  return `[${level}] Count: ${count}`;
});

// ✓ Good: Re-runs only when itemCount changes; logLevel is read but not a dependency
const display = computed(() => {
  const count = itemCount();
  const level = untrack(() => logLevel());
  return `[${level}] Count: ${count}`;
});
```

## Do's and Don'ts

**Do**

- Create a signals store (or module) for shared state; keep signals and computed values in one place.

- Use `batch()` when updating multiple signals in one logical step so dependents run once.

- Use `watch` in Lit templates to subscribe only the template part that needs the signal.

- Use a method or stored function reference for event handlers (e.g. `@click=${this.#handler}`) instead of inline arrow functions, so the reference is not re-created on every render.

- Use `@SignalProp` for component props that should be reactive signals.

- Use `untrack()` when you need a signal's value without adding it as a dependency.

**Don't**

- Create unnecessary dependencies in computed/effect (causes extra recomputation; use `untrack` when you only need a value).

- Read a signal in a Lit template without `watch` (the template will not update when the signal changes).

- Mix signal and non-signal state in the same component without a clear pattern.

## Pro tip: when to use batch vs untrack

Use **`batch`** when you are updating several signals in one logical step (e.g. after a fetch or in one event handler) so dependents run once. Use **`untrack`** when a computed or effect needs to read a signal's value without subscribing to it (e.g. for comparison or logging without creating a dependency).

## Pro tip: forcing a full component update when a signal changes

- **Preferred:** Use **`watch`** in the template so only the bound parts re-render.
- **When you need the whole component to re-render:** Use an **`effect`** that reads the signal(s) and calls **`this.requestUpdate()`**.
  - Start the effect in **`connectedCallback`**, call the returned stop function in **`disconnectedCallback`** (so it cleans up when the element is removed and re-creates when re-inserted).
  - The effect is not auto-disposed—you must call the stop function.

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { effect } from "@genexus/kasstor-signals/core/effect.js";
import { signal } from "@genexus/kasstor-signals/core/signal.js";
import { html } from "lit";

const searchQuery = signal("");

/**
 * Search UI that subscribes to searchQuery via effect and requestUpdate.
 * @access public
 */
@Component({ tag: "app-search" })
export class AppSearch extends KasstorElement {
  #stopEffect?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#stopEffect = effect(() => {
      searchQuery(); // subscribe to signal
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.#stopEffect?.();
    super.disconnectedCallback();
  }

  override render() {
    return html`<p>Query: ${searchQuery()}</p>`;
  }
}
```

