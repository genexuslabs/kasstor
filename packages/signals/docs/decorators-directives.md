# Decorators and Directives — @genexus/kasstor-signals

## SignalProp

Turns a class property into a reactive signal. Read and write the property normally; use `$propName` for the raw signal when passing to `watch` or when you need the signal function (e.g. `trigger(this.$count)`).

### Behavior

- The property getter/setter uses an underlying signal. **Changes to the property do not trigger component re-renders**—in Lit, use the `watch` directive in the template so the UI updates when the value changes.
- You can use the property inside **`computed`** and **`effect`**: reading `this.propName` tracks the underlying signal, so the computed or effect updates when the property changes. Use `watch(this.propName)` or `watch(this.$propName)` in templates.

### Typing `this.$propName`

For correct TypeScript types when using `this.$propName`, add a `declare` for the raw signal: `declare $propName: KasstorSignalState<MyClass["propName"]>;`. Import the type from the package: `import type { KasstorSignalState } from "@genexus/kasstor-signals"`.

### Restrictions

Apply to class instance fields. Initializer value is the signal's initial value.

### Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
import type { KasstorSignalState } from "@genexus/kasstor-signals";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

/**
 * Counter with a reactive count via @SignalProp; uses watch in template.
 * @access public
 */
@Component({ tag: "app-counter" })
export class AppCounter extends KasstorElement {
  declare $count: KasstorSignalState<AppCounter["count"]>;

  /** Current counter value. */
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

### Example (computed and effect with SignalProp)

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

### Example (multiple SignalProps)

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";

/**
 * User profile that loads name and email by userId; uses SignalProp for reactive props.
 * @access public
 */
@Component({ tag: "app-user-profile" })
export class AppUserProfile extends KasstorElement {
  @state() isLoading = false;

  /** Id of the user to load; when set, profile data is fetched. */
  @property() userId: string = "";

  /** User full name. */
  @SignalProp name: string = "";

  /** User email address. */
  @SignalProp email: string = "";

  protected async updated(changedProperties: Map<PropertyKey, unknown>): Promise<void> {
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

## watch

> **Essential for Lit:** Without `watch`, Lit templates do not update when a signal changes. Changing a signal does not trigger a component update. Always use **`watch(signal)`** in the template wherever you render a signal so that part subscribes and re-renders.

**Pin-point updates:** Only the bindings wrapped in `watch` are updated when their signal changes; the rest of the template is skipped. Updates from `watch` participate in the Lit reactive update lifecycle. The benefit scales with template size: more bindings and logic mean more work skipped when only a few signals change. Wrap each signal read in the template with `watch(signal)` so that:

- The current value is rendered.
- That part of the template subscribes to the signal and re-renders when the value changes.

### Behavior

Renders the current value and subscribes; if the host has a pending update when the signal changes, the part updates in that cycle, otherwise in a microtask. Works with SSR.

### Restrictions

Pass a signal or computed (getter function), not a plain value.

### Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { signal } from "@genexus/kasstor-signals/core/signal.js";
import { watch } from "@genexus/kasstor-signals/directives/watch.js";
import { html } from "lit";

const notificationCount = signal(0);

/**
 * Notifications header with badge count from a shared signal; uses watch in template.
 * @access public
 */
@Component({ tag: "app-notifications" })
export class AppNotifications extends KasstorElement {
  #increaseNotificationCount = (): void => {
    notificationCount(notificationCount() + 1);
  };

  render() {
    return html`
      <header>
        <span class="badge">${watch(notificationCount)}</span>
      </header>
      <button @click=${this.#increaseNotificationCount}>Notify</button>
    `;
  }
}
```

### Example (complex)

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
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
    ${todos.map(todo => html`<li ?data-completed=${todo.completed}>${todo.text}</li>`)}
  `;
});

/**
 * Todo list that renders items from a shared signal template computed; uses watch.
 * @access public
 */
@Component({ tag: "app-todo-list" })
export class AppTodoList extends KasstorElement {
  render() {
    return html`<ul>
      ${watch(todoListTemplate)}
    </ul>`;
  }
}
```
