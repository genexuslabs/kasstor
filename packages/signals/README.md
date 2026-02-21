# @genexus/kasstor-signals

A reactive signals system for state management that works with any JavaScript application and provides a decorator and directives for seamless integration with Lit components built with `@genexus/kasstor-core`. Built on [alien-signals](https://github.com/stackblitz/alien-signals).

## Table of Contents

- [Installation](#installation)
- [Quick example (Lit + watch)](#quick-example-lit--watch)
- [Core Concepts](#core-concepts)
- [Based on alien-signals](#based-on-alien-signals)
- [API](#api)
  - [Core](#core)
    - [`signal`](#signal)
    - [`computed`](#computed)
    - [`effect`](#effect)
    - [`effectScope`](#effectscope)
    - [`trigger`](#trigger)
    - [`batch`](#batch)
    - [`untrack`](#untrack)
  - [Decorators](#decorators)
    - [`SignalProp`](#signalprop)
  - [Directives](#directives)
    - [`watch`](#watch)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## Installation

```bash
npm i @genexus/kasstor-signals
```

## Quick example (Lit + watch)

In Lit, wrap every signal you render in the template with **`watch`** so that part updates when the signal changes:

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core";
import { computed, signal } from "@genexus/kasstor-signals/core.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const count = signal(0);
const doubled = computed(() => count() * 2);

@Component({ tag: "my-counter" })
export class MyCounter extends KasstorElement {
  #incrementCount = (): void => {
    count(count() + 1);
  };

  override render() {
    return html`
      <p>Count: ${watch(count)}</p>
      <p>Doubled: ${watch(doubled)}</p>
      <button @click=${this.#incrementCount}>Increment count (+1)</button>
    `;
  }
}
```

## Core Concepts

Signals are reactive values that automatically track dependencies and notify subscribers when they change. This creates a reactive system without the complexity of manual subscription management.

### Why Signals?

- **Automatic dependency tracking**: Effects and computed values automatically know which signals they depend on.

- **Minimal updates**: Only components that depend on changed signals are updated.

- **Simple API**: Create reactive state with just a function call.

- **Framework agnostic**: Works with vanilla JS, Lit, or any framework.

### Using signals with Lit

> **Use `watch` in templates.** Changing a signal does not trigger a Lit component update. To have the template update, you must subscribe where you read the signal: use the **`watch`** directive for each place you render a signal (or use an effect + `requestUpdate()` for a full re-render—see Pro tip below).

This is a design choice for performance: only the parts wrapped in `watch` re-render (pin-point updates).

### Based on alien-signals

This package is based on [alien-signals](https://github.com/stackblitz/alien-signals), a minimal, push-pull signal library. Alien-signals is designed for performance (no Array/Set/Map in the core, no recursion in the algorithm), fine-grained reactivity, and a simple API. Its algorithm is related to Vue 3’s propagation, Preact’s double-linked-list approach, and Svelte’s effect scheduling. The core has been adopted by [Vue 3.6](https://github.com/vuejs/core/pull/12349). We re-export and document the core primitives, add general utilities (e.g. `batch`, `untrack`) that work in any JavaScript environment, and Lit-specific utilities (decorators, directives).

## API

### Core

Core primitives are re-exported from the package and can be used in any JavaScript environment. Import from `@genexus/kasstor-signals` or `@genexus/kasstor-signals/core.js`. You can also import individual utilities from subpaths (e.g. `@genexus/kasstor-signals/core/signal.js`, `@genexus/kasstor-signals/core/batch.js`). Signals are getter/setter functions: call with no args to read, with one arg to write.

#### `signal`

Creates a reactive value. The returned function is the signal: call with no arguments to read, call with one argument to set (setter returns void).

- **Behavior:**
  - Reading the signal (e.g. inside `computed` or `effect`) tracks it as a dependency.
  - Setting the value notifies dependents. Updates can be batched with `batch`.

#### Example

```ts
import { signal } from "@genexus/kasstor-signals/core/signal.js";

const count = signal(0);

console.log(count()); // 0
count(5);
console.log(count()); // 5
```

#### In a Lit component (with `watch`)

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { signal } from "@genexus/kasstor-signals/core/signal.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const count = signal(0);
const doubleCount = computed(() => count() * 2);

@Component({ tag: "my-counter" })
export class MyCounter extends KasstorElement {
  #incrementCount = () => {
    count(count() + 1);
  };

  override render() {
    return html`
      <p>Count: ${watch(count)}</p>
      <p>Double count: ${watch(doubleCount)}</p>
      <button @click=${this.#incrementCount}>Increment</button>
    `;
  }
}
```

#### `computed`

Creates a memoized derived value. Read-only. The computation runs only when someone reads the value (e.g. calls the getter); if nobody reads it, the computation is not executed. When dependencies change, the computed is marked for recomputation and runs again on the next read.

- **Behavior:**
  - Lazy / on read: the getter runs only when the computed is read. If no effect or code reads it, the computation does not run. When dependencies change, the computed runs again on the next read.
  - Only signals (and computeds) read during the run are tracked as dependencies.
  - Use `untrack` inside the function to read a value without adding a dependency.

#### Example

```ts
import { signal, computed } from "@genexus/kasstor-signals/core.js";

const firstName = signal("John");
const lastName = signal("Doe");

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
firstName("Jane");
console.log(fullName()); // "Jane Doe"
```

#### Example (real-world)

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { signal, computed } from "@genexus/kasstor-signals/core.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const items = signal([
  { id: 1, name: "Item 1", price: 100 },
  { id: 2, name: "Item 2", price: 200 }
]);

const totalPrice = computed(() => {
  return items().reduce((sum, item) => sum + item.price, 0);
});

const itemCount = computed(() => items().length);

@Component({ tag: "app-cart" })
export class AppCart extends KasstorElement {
  override render() {
    return html`
      <div>
        <p>Items: ${watch(itemCount)}</p>
        <p>Total: $${watch(totalPrice)}</p>
      </div>
    `;
  }
}
```

#### `effect`

Runs a side effect that re-runs whenever its dependencies change. Use for syncing to localStorage, updating the DOM, or running logic when specific signals change. In a **Lit component**, you can use an effect that reads the signal(s) and calls **`this.requestUpdate()`** so the component re-renders when the signal changes; start the effect in **`connectedCallback`** and call the returned stop function in **`disconnectedCallback`** so it is cleaned up when the element is removed and re-created when re-inserted (see [Pro tip: forcing a full component update](#pro-tip-forcing-a-full-component-update-when-a-signal-changes)). The effect is **not** auto-disposed when nothing references it—you must call the stop function to remove the subscription.

- **Behavior:**
  - Runs once immediately, then again whenever any tracked signal/computed read inside the function changes.
  - Return value is a function that stops the effect (call it to avoid memory leaks and to clean up when the component is disconnected).

#### Example

```ts
import { signal, effect } from "@genexus/kasstor-signals/core.js";

const theme = signal("light");

// Sync theme to localStorage and DOM whenever it changes
effect(() => {
  const value = theme();
  localStorage.setItem("theme", value);
  document.documentElement.setAttribute("data-theme", value);
});

theme("dark"); // Effect runs again: storage and DOM update
```

#### Example (effectScope)

Use `effectScope` when you need to run effects and dispose them together (e.g. when a component or feature unmounts). Pass a callback that creates effects; the returned function stops the scope and disposes all of them.

```ts
import { signal, effect, effectScope } from "@genexus/kasstor-signals/core.js";

const searchQuery = signal("");

const stopScope = effectScope(() => {
  effect(() => {
    console.log("Search changed:", searchQuery());
  });
});

searchQuery("hello"); // Logs: "Search changed: hello"

// Clean up all effects in this scope
stopScope();
searchQuery("world"); // Nothing logs; effect is disposed
```

#### `effectScope`

Groups multiple reactive effects and computeds into a single scope and returns a stop function. Calling it disposes all effects created inside, so you control them as one unit. Useful for modular, reusable logic and to avoid memory leaks in long-lived applications.

- **Behavior:** The callback runs immediately; effects/computeds created inside are tied to the scope. The returned function stops the scope and disposes all of them. Nested scopes are supported: stopping a parent stops its children.

- **Use cases:** Avoid memory leaks by stopping the scope when a component or feature unmounts; group reactive logic into reusable modules that can be cleanly started or stopped.

#### `trigger`

Manually notifies a signal’s dependents without changing its value. Use when you mutate a value in place (e.g. push into an array stored in the signal); the setter is never called, so dependents would not run otherwise.

- **Utility:**
  - After in-place mutation, call `trigger(signal)` so computed values and effects that depend on that signal recompute.
  - To notify multiple signals at once, pass a function that reads them: `trigger(() => { src1(); src2(); })`.

#### Example (trigger after mutation)

```ts
import { signal, computed, trigger } from "@genexus/kasstor-signals/core.js";

const arr = signal<number[]>([]);
const length = computed(() => arr().length);

console.log(length()); // 0

arr().push(1);
console.log(length()); // Still 0

trigger(arr);
console.log(length()); // 1
```

#### Example (trigger multiple signals)

```ts
import { signal, computed, trigger } from "@genexus/kasstor-signals/core.js";

const src1 = signal<number[]>([]);
const src2 = signal<number[]>([]);
const total = computed(() => src1().length + src2().length);

src1().push(1);
src2().push(2);

trigger(() => {
  src1();
  src2();
});
console.log(total()); // 2
```

### Decorators

Decorators turn class members into reactive signals or wire them to the signals system.

#### `SignalProp`

Turns a class property into a reactive signal. Read and write the property normally; use `$propName` for the raw signal when passing to `watch` or when you need the signal function (e.g. `trigger(this.$count)`).

- **Behavior:**
  - The property getter/setter uses an underlying signal. **Changes to the property do not trigger component re-renders**—in Lit, use the `watch` directive in the template so the UI updates when the value changes.
  - You can use the property inside **`computed`** and **`effect`**: reading `this.propName` tracks the underlying signal, so the computed or effect updates when the property changes. Use `watch(this.propName)` or `watch(this.$propName)` in templates.

- **Typing `this.$propName`:** For correct TypeScript types when using `this.$propName`, add a `declare` for the raw signal: `declare $propName: KasstorSignalState<MyClass["propName"]>;`. Import the type from the package: `import type { KasstorSignalState } from "@genexus/kasstor-signals"`.

- **Restrictions:** Apply to class instance fields. Initializer value is the signal's initial value.

#### Example

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
import type { KasstorSignalState } from "@genexus/kasstor-signals";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

@Component({ tag: "app-counter" })
export class AppCounter extends KasstorElement {
  declare $count: KasstorSignalState<AppCounter["count"]>;

  /** Current counter value */
  @SignalProp count: number = 0;

  #onIncrement = (): void => {
    this.count++;
  };

  render() {
    return html`
      <p>Count: ${watch(this.$count)}</p>
      <button @click=${this.#onIncrement}>Increment</button>
    `;
  }
}
```

#### Example (computed and effect with SignalProp)

You can derive values with `computed` and run side effects with `effect` from a `@SignalProp` property; reading the property tracks it as a dependency.

```ts
import { computed, effect } from "@genexus/kasstor-signals/core.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";

class Counter {
  @SignalProp count = 1;
  @SignalProp step = 2;

  total = computed(() => this.count * this.step);
}

const c = new Counter();
console.log(c.total()); // 2

c.count = 10;
console.log(c.total()); // 20

// effect re-runs when a tracked SignalProp changes
const stop = effect(() => {
  console.log("count is", c.count);
});
c.count = 5; // effect runs again
stop();
```

#### Example (multiple SignalProps)

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";

@Component({ tag: "app-user-profile" })
export class AppUserProfile extends KasstorElement {
  @state() isLoading = false;

  @property() userId: string = "";

  /** User full name */
  @SignalProp name: string = "";

  /** User email address */
  @SignalProp email: string = "";

  protected async updated(
    changedProperties: Map<PropertyKey, unknown>
  ): Promise<void> {
    if (changedProperties.has("userId") && this.userId) {
      await this.#loadUserData();
    }
  }

  #loadUserData = async (): Promise<void> => {
    this.isLoading = true; // Triggers update
    try {
      const response = await fetch(`/api/users/${this.userId}`);
      const data = await response.json();
      this.name = data.name;
      this.email = data.email;
    } finally {
      this.isLoading = false; // Triggers update
    }
  };

  override render() {
    if (this.isLoading) {
      return html`<p>Loading...</p>`;
    }

    return html`
      <div>
        <p><strong>Name:</strong> ${watch(this.name)}</p>
        <p><strong>Email:</strong> ${watch(this.email)}</p>
      </div>
    `;
  }
}
```

### Directives

Directives are used in Lit templates to subscribe to signals and update only the bound part when the value changes.

#### `watch`

> **Essential for Lit:** Without `watch`, Lit templates do not update when a signal changes. Changing a signal does not trigger a component update. Always use **`watch(signal)`** in the template wherever you render a signal so that part subscribes and re-renders.

This is intentional (pin-point updates): only the parts wrapped in `watch` re-render when their signal changes, which improves performance. Wrap each signal read in the template with `watch(signal)` so that:

- The current value is rendered.
- That part of the template subscribes to the signal and re-renders when the value changes.

- **Behavior:** Renders the current value and subscribes; if the host has a pending update when the signal changes, the part updates in that cycle, otherwise in a microtask. Works with SSR.

- **Restrictions:** Pass a signal or computed (getter function), not a plain value.

#### Example

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { signal } from "@genexus/kasstor-signals/core/signal.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const notificationCount = signal(0);

@Component({ tag: "app-notifications" })
export class AppNotifications extends KasstorElement {
  #onNotify = (): void => {
    notificationCount(notificationCount() + 1);
  };

  render() {
    return html`
      <header>
        <span class="badge">${watch(notificationCount)}</span>
      </header>
      <button @click=${this.#onNotify}>Notify</button>
    `;
  }
}
```

#### Example (complex)

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { signal, computed } from "@genexus/kasstor-signals/core/signal.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const todoList = signal([
  { id: 1, text: "Learn Signals", completed: false },
  { id: 2, text: "Build App", completed: true }
]);

const todoListTemplate = computed(() => {
  const todos = todoList();
  return html`
    ${todos.map(
      todo => html`<li ?data-completed=${todo.completed}>${todo.text}</li>`
    )}
  `;
});

@Component({ tag: "app-todo-list" })
export class AppTodoList extends KasstorElement {
  render() {
    return html`<ul>
      ${watch(todoListTemplate)}
    </ul>`;
  }
}
```

#### `batch`

Runs the callback and flushes all signal updates once it completes. **Improves performance:** computed values and effects that track multiple dependencies run only once when you change several of those dependencies inside the batch, instead of once per changed signal.

- **Behavior:**
  - All signal writes inside `fn` are deferred; dependents (computed, effect) run only after `fn` returns.
  - Nested batches are supported; the outer batch flushes when its callback completes.
  - Reading a signal inside the batch sees the updated value.
  - `fn` is synchronous; returns the return value of `fn`.

#### Example (without batch vs with batch)

```ts
import {
  batch,
  signal,
  computed,
  effect
} from "@genexus/kasstor-signals/core.js";

const firstName = signal("John");
const lastName = signal("Doe");
const fullName = computed(() => `${firstName()} ${lastName()}`);

effect(() => {
  console.log("fullName is", fullName());
});
// Logs once: "fullName is John Doe"

// Without batch: effect runs after each write
firstName("Jane"); // Logs: "fullName is Jane Doe"
lastName("Smith"); // Logs again: "fullName is Jane Smith"

// With batch: effect runs once at the end
batch(() => {
  firstName("Alice");
  lastName("Brown");
});
// Logs once: "fullName is Alice Brown"
```

#### `untrack`

Runs the function without tracking any signal reads. Use inside a computed or effect when you need a value without adding a dependency.

- **Behavior:**
  - Any signal/computed read inside `fn` does not register as a dependency of the current effect or computed.
  - Common use: in an effect that reads several signals, wrap the ones you don’t want to track so the effect only re-runs when the others change.

#### Example

```ts
import { signal, effect, untrack } from "@genexus/kasstor-signals/core.js";

const userName = signal("Alice");
const theme = signal("light");
const logLevel = signal("info");

// Re-run only when userName or theme changes; read logLevel without tracking it
effect(() => {
  const name = userName();
  const themeValue = theme();
  const level = untrack(() => logLevel()); // not a dependency

  console.log(`[${level}] User ${name}, theme ${themeValue}`);
});
// Logs: "[info] User Alice, theme light"

userName("Bob"); // Logs again (we track userName)
theme("dark"); // Logs again (we track theme)
logLevel("debug"); // Does not log (we don't track logLevel)
```

## Best Practices

### Signal Organization

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

### Using the Store in Components

When a component reads signals from a store in its template, the component must subscribe so it re-renders when those signals change. Either use **`watch`** for each signal in the template (pin-point updates) or run an **`effect`** that reads the signals and calls **`this.requestUpdate()`** so the whole component updates. Use **`connectedCallback`** to start the effect and **`disconnectedCallback`** to stop it (so the effect is cleaned up when the element is removed and re-created when it is re-inserted, e.g. when moved in the DOM). The effect is not auto-disposed by the library—you must call the returned stop function.

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core";
import { effect } from "@genexus/kasstor-signals/core/effect.js";
import { displayName, isLoading } from "../signals/app-store";
import { html } from "lit";

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
    this.#stopEffect?.();
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <header>
        ${isLoading()
          ? html`<p>Loading...</p>`
          : html`<h1>Welcome ${displayName()}</h1>`}
      </header>
    `;
  }
}
```

### Avoid Over-Tracking

Use `untrack` when you read a signal for display (or side effect) but don’t want changes to that signal to trigger a re-run. The computed or effect should have at least one tracked dependency so it can update when needed; use `untrack` only on the reads you want to exclude.

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

### Do's and Don'ts

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

### Pro tip: when to use `batch` vs `untrack`

Use **`batch`** when you are updating several signals in one logical step (e.g. after a fetch or in one event handler) so dependents run once. Use **`untrack`** when a computed or effect needs to read a signal's value without subscribing to it (e.g. for comparison or logging without creating a dependency).

### Pro tip: forcing a full component update when a signal changes

- **Preferred:** Use **`watch`** in the template so only the bound parts re-render.
- **When you need the whole component to re-render:** Use an **`effect`** that reads the signal(s) and calls **`this.requestUpdate()`**.
  - Start the effect in **`connectedCallback`**, call the returned stop function in **`disconnectedCallback`** (so it cleans up when the element is removed and re-creates when re-inserted).
  - The effect is not auto-disposed—you must call the stop function.

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { effect } from "@genexus/kasstor-signals/core/effect.js";
import { signal } from "@genexus/kasstor-signals/core/signal.js";
import { html } from "lit";

const searchQuery = signal("");

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

## API Reference

### Core

- **`signal<T>(initialValue: T)`** — Returns a getter/setter function: call with no args to read, one arg to set (setter returns void).

- **`computed<T>(fn: () => T)`** — Returns a memoized getter.
  - Computation runs only when the value is read; if nobody reads it, it does not run.
  - Only signals/computeds read during the run are tracked; recomputes on next read when dependencies change.

- **`effect(fn: () => void)`** — Runs the function and re-runs when dependencies change.
  - Returns a stop function (call it to remove the subscription; the effect is not auto-disposed).

- **`batch<T>(fn: () => T)`** — Runs `fn` (synchronous); defers signal updates and flushes when `fn` completes.
  - Improves performance: computeds and effects that track multiple dependencies run only once when you change several of them in the batch.
  - Returns the return value of `fn`. Nested batches supported; reading a signal inside sees the updated value.

- **`untrack<T>(fn: () => T)`** — Runs `fn` without tracking signal reads; returns the return value of `fn`. Use inside computed/effect to read a value without adding a dependency.

- **`effectScope(fn)`** — Runs the callback (which can create effects/computeds) and returns a stop function.
  - Call it to dispose all effects in the scope. Nested scopes: stopping a parent stops its children.
  - Use to avoid memory leaks and for scoped state management.

- **`trigger(target)`** — Manually notifies a signal’s dependents without changing its value.
  - Use after in-place mutation (e.g. `arr().push(1)` then `trigger(arr)`).
  - To trigger multiple signals: `trigger(() => { src1(); src2(); })`.

- **Type guards:** `isSignal`, `isComputed`, `isEffect`, `isEffectScope` — Return true if the value is the corresponding reactive primitive.

### Decorators

- **`@SignalProp`** — Class decorator: turns a property into a reactive signal.
  - Read/write the property normally; use `$propName` for the raw signal (e.g. for `watch` or `trigger`).
  - For TypeScript typing of `this.$propName`, add `declare $propName: KasstorSignalState<MyClass["propName"]>;` (import `KasstorSignalState` from the package).
  - Changes to the property do not trigger component re-renders—use `watch` in the template.
  - You can use the property inside `computed` and `effect` (reading it tracks the signal).
  - Apply to class instance fields; initializer is the signal’s initial value. Import from `@genexus/kasstor-signals/decorators/signal-prop.js`.

### Directives

- **`watch(signal)`** — Lit directive: subscribes to a signal (or computed) in a template and re-renders only that part when the value changes.
  - Without `watch`, Lit templates do not update when a signal changes.
  - Pass a signal/computed getter; returns the current value for rendering. Import from `@genexus/kasstor-signals/directives/watch.js`.

## Contributing

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more information.
