# Core API

Core primitives are re-exported from the package and can be used in any JavaScript environment. Import from `@genexus/kasstor-signals` or `@genexus/kasstor-signals/core.js`. You can also import individual utilities from subpaths (e.g. `@genexus/kasstor-signals/core/signal.js`, `@genexus/kasstor-signals/core/batch.js`). Signals are getter/setter functions: call with no args to read, with one arg to write.

## signal

Creates a reactive value. The returned function is the signal: call with no arguments to read, call with one argument to set (setter returns void).

### Behavior

- Reading the signal (e.g. inside `computed` or `effect`) tracks it as a dependency.
- Setting the value notifies dependents. Updates can be batched with `batch`.

### Example

```ts
import { signal } from "@genexus/kasstor-signals/core/signal.js";

const count = signal(0);

console.log(count()); // 0
count(5);
console.log(count()); // 5
```

### In a Lit component (with `watch`)

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { computed, signal } from "@genexus/kasstor-signals/core.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const count = signal(0);
const doubleCount = computed(() => count() * 2);

/**
 * Counter that displays a signal and its doubled value; uses watch in template.
 * @access public
 */
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

## computed

Creates a memoized derived value. Read-only. The computation runs only when someone reads the value (e.g. calls the getter); if nobody reads it, the computation is not executed. When dependencies change, the computed is marked for recomputation and runs again on the next read.

### Behavior

- Lazy / on read: the getter runs only when the computed is read. If no effect or code reads it, the computation does not run. When dependencies change, the computed runs again on the next read.
- Only signals (and computeds) read during the run are tracked as dependencies.
- Use `untrack` inside the function to read a value without adding a dependency.

### Example

```ts
import { signal, computed } from "@genexus/kasstor-signals/core.js";

const firstName = signal("John");
const lastName = signal("Doe");

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
firstName("Jane");
console.log(fullName()); // "Jane Doe"
```

### Example (real-world)

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
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

/**
 * Cart summary that displays item count and total price from shared signals.
 * @access public
 */
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

## effect

Runs a side effect that re-runs whenever its dependencies change. Use for syncing to localStorage, updating the DOM, or running logic when specific signals change. In a **Lit component**, you can use an effect that reads the signal(s) and calls **`this.requestUpdate()`** so the component re-renders when the signal changes; start the effect in **`connectedCallback`** and call the returned stop function in **`disconnectedCallback`** so it is cleaned up when the element is removed and re-created when re-inserted. The effect is **not** auto-disposed when nothing references it—you must call the stop function to remove the subscription.

### Behavior

- Runs once immediately, then again whenever any tracked signal/computed read inside the function changes.
- Return value is a function that stops the effect (call it to avoid memory leaks and to clean up when the component is disconnected).

### Example

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

### Example (effectScope)

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

## effectScope

Groups multiple reactive effects and computeds into a single scope and returns a stop function. Calling it disposes all effects created inside, so you control them as one unit. Useful for modular, reusable logic and to avoid memory leaks in long-lived applications.

### Behavior

The callback runs immediately; effects/computeds created inside are tied to the scope. The returned function stops the scope and disposes all of them. Nested scopes are supported: stopping a parent stops its children.

### Use cases

Avoid memory leaks by stopping the scope when a component or feature unmounts; group reactive logic into reusable modules that can be cleanly started or stopped.

## trigger

Manually notifies a signal's dependents without changing its value. Use when you mutate a value in place (e.g. push into an array stored in the signal); the setter is never called, so dependents would not run otherwise.

### Utility

- After in-place mutation, call `trigger(signal)` so computed values and effects that depend on that signal recompute.
- To notify multiple signals at once, pass a function that reads them: `trigger(() => { src1(); src2(); })`.

### Example (trigger after mutation)

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

### Example (trigger multiple signals)

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

## batch

Runs the callback and flushes all signal updates once it completes. **Improves performance:** computed values and effects that track multiple dependencies run only once when you change several of those dependencies inside the batch, instead of once per changed signal.

### Behavior

- All signal writes inside `fn` are deferred; dependents (computed, effect) run only after `fn` returns.
- Nested batches are supported; the outer batch flushes when its callback completes.
- Reading a signal inside the batch sees the updated value.
- `fn` is synchronous; returns the return value of `fn`.

### Example (without batch vs with batch)

```ts
import { batch, signal, computed, effect } from "@genexus/kasstor-signals/core.js";

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

## untrack

Runs the function without tracking any signal reads. Use inside a computed or effect when you need a value without adding a dependency.

### Behavior

- Any signal/computed read inside `fn` does not register as a dependency of the current effect or computed.
- Common use: in an effect that reads several signals, wrap the ones you don't want to track so the effect only re-runs when the others change.

### Example

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
