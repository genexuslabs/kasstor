# @genexus/kasstor-signals

A reactive signals system for state management that works with any JavaScript application and provides a decorator and directives for seamless integration with Lit components built with `@genexus/kasstor-core`. Built on [alien-signals](https://github.com/stackblitz/alien-signals).

## API Reference

Consult this table to choose which document to load. Details and examples are in the linked sub-readmes.

### Core ([core.md](core.md))

| API | Description |
|-----|-------------|
| [signal](core.md#signal) | Creates reactive value; getter/setter function. Call with no args to read, one arg to set. Reading tracks dependency; setting notifies dependents. |
| [computed](core.md#computed) | Memoized getter. Computation runs only when read; recomputes on next read when dependencies change. Only signals read during run are tracked. |
| [effect](core.md#effect) | Runs function and re-runs when dependencies change. Returns stop function (call to remove subscription; not auto-disposed). |
| [effectScope](core.md#effectscope) | Groups effects; returns stop function. Call to dispose all effects in scope. Nested scopes: stopping parent stops children. |
| [trigger](core.md#trigger) | Manually notifies signal's dependents without changing value. Use after in-place mutation. `trigger(() => { src1(); src2(); })` for multiple. |
| [batch](core.md#batch) | Runs `fn`; defers updates, flushes when `fn` completes. Computeds/effects run once when multiple deps change. Returns `fn` return value. |
| [untrack](core.md#untrack) | Runs `fn` without tracking signal reads. Use inside computed/effect to read without adding dependency. |
| Type guards | `isSignal`, `isComputed`, `isEffect`, `isEffectScope` — Return true if value is corresponding primitive. |

### Decorators and Directives ([decorators-directives.md](decorators-directives.md))

| API | Description |
|-----|-------------|
| [SignalProp](decorators-directives.md#signalprop) | Turns property into reactive signal. Read/write normally; use `$propName` for raw signal (watch, trigger). Add `declare $propName: KasstorSignalState<...>` for typing. Changes do not trigger re-render—use `watch` in template. |
| [watch](decorators-directives.md#watch) | Lit directive: subscribes to signal in template; re-renders only that part when value changes. Without `watch`, Lit templates do not update. Pass signal/computed getter. |

## Installation

```bash
npm i @genexus/kasstor-signals
```

## Quick example (Lit + watch)

In Lit, wrap every signal you render in the template with **`watch`** so that part updates when the signal changes:

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { computed, signal } from "@genexus/kasstor-signals/core.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const count = signal(0);
const doubled = computed(() => count() * 2);

/**
 * Counter that displays a signal and its doubled value; uses watch in template.
 * @access public
 */
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

### What are signals?

Signals are data structures for managing **observable state**. A signal holds a value (or a computed value that depends on other signals). When a signal changes, consumers that depend on it are notified. Because signals form a **dependency graph**, computed values re-compute and effects re-run when their dependencies change. Signals are well-suited for **shared state**: values that many components may read or update.

Signal APIs typically have three main concepts:

- **State signals** — Hold a single value (e.g. `signal(0)`). Read and write the value; dependents are notified on write.
- **Computed signals** — Wrap a computation that depends on other signals (e.g. `computed(() => a() + b())`). Memoized; recompute when dependencies change.
- **Watchers / effects** — Run side-effectful code when signal values change (e.g. `effect(() => { ... })`). Used to sync state, update the DOM, or trigger component updates.

### Why signals?

- **Automatic dependency tracking**: Effects and computed values automatically know which signals they depend on.

- **Minimal updates**: Only the code that depends on changed signals runs again (or, in Lit with `watch`, only the bound parts of the template).

- **Simple API**: Create reactive state with a function call; no manual subscription management.

- **Framework agnostic**: Works with vanilla JS, Lit, or any framework.

### Using signals with Lit

> **Use `watch` in templates.** Changing a signal does not trigger a Lit component update. To have the template update, you must subscribe where you read the signal: use the **`watch`** directive for each place you render a signal (or use an effect + `requestUpdate()` for a full re-render—see Pro tip in [best-practices.md](best-practices.md)).

This is a design choice for performance: only the parts wrapped in `watch` re-render (pin-point updates).

### Based on alien-signals

This package is based on [alien-signals](https://github.com/stackblitz/alien-signals), a minimal, push-pull signal library. Alien-signals is designed for performance (no Array/Set/Map in the core, no recursion in the algorithm), fine-grained reactivity, and a simple API. Its algorithm is related to Vue 3's propagation, Preact's double-linked-list approach, and Svelte's effect scheduling. The core has been adopted by [Vue 3.6](https://github.com/vuejs/core/pull/12349). We re-export and document the core primitives, add general utilities (e.g. `batch`, `untrack`) that work in any JavaScript environment, and Lit-specific utilities (decorators, directives).
