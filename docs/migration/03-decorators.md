# Decorators

This page covers how each StencilJS decorator maps to its Kasstor or Lit equivalent.

## `@Prop()` → `@property()`

Lit's `@property()` decorator replaces Stencil's `@Prop()`. The main differences:

- Import from `lit/decorators/property.js` instead of `@stencil/core`.
- You must specify `type` for non-string properties (`type: Number`, `type: Boolean`).
- For complex types (objects, arrays), use `attribute: false` to disable attribute reflection.
- All properties are internally mutable — there is no `mutable` option.
- `reflect: true` works the same way.

**StencilJS:**

```tsx
import { Component, Prop, h } from "@stencil/core";

@Component({ tag: "my-slider", shadow: true })
export class MySlider {
  @Prop() label: string = "Volume";
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop() value: number = 50;
  @Prop({ mutable: true }) selectedItem: string | undefined;
  @Prop({ attribute: "max-value" }) maxValue: number = 100;
  @Prop() items: string[] = [];

  render() {
    return <div>{this.label}: {this.value}</div>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";

@Component({ tag: "my-slider" })
export class MySlider extends KasstorElement {
  @property() label: string = "Volume";
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Number }) value: number = 50;
  @property() selectedItem: string | undefined;
  @property({ attribute: "max-value", type: Number }) maxValue: number = 100;
  @property({ attribute: false }) items: string[] = [];

  override render() {
    return html`<div>${this.label}: ${this.value}</div>`;
  }
}
```

> **Tip:** When the attribute is just the dash-case version of the property name (e.g. `maxValue` → `max-value`), Lit handles the conversion automatically, so `attribute: "max-value"` is optional for `maxValue`. However, explicit is often clearer.

## `@State()` → `@state()`

Lit's `@state()` works the same as Stencil's `@State()`: it marks internal reactive state that triggers re-renders but is not exposed as an HTML attribute. The only difference is that you should add `private` or `protected` to satisfy strict TypeScript.

**StencilJS:**

```tsx
import { Component, State, h } from "@stencil/core";

@Component({ tag: "my-dropdown", shadow: true })
export class MyDropdown {
  @State() isOpen: boolean = false;
  @State() selectedIndex: number = -1;

  render() {
    return <div class={{ open: this.isOpen }}>...</div>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { state } from "lit/decorators/state.js";

@Component({ tag: "my-dropdown" })
export class MyDropdown extends KasstorElement {
  @state() private isOpen: boolean = false;
  @state() private selectedIndex: number = -1;

  override render() {
    return html`<div class=${this.isOpen ? "open" : ""}>...</div>`;
  }
}
```

## `@Event()` + `EventEmitter<T>`

Kasstor provides its own `@Event` decorator that works similarly to Stencil's. The main differences:

- Import from `@genexus/kasstor-core/decorators/event.js`.
- Add `!` (definite assignment assertion) for strict TypeScript.
- Add `protected` access modifier.
- The event name is the property name (same casing, no automatic dash-case conversion).
- `emit()` returns the dispatched `CustomEvent`, which you can check for `defaultPrevented`.

**StencilJS:**

```tsx
import { Component, Event, EventEmitter, h } from "@stencil/core";

@Component({ tag: "my-input", shadow: true })
export class MyInput {
  @Event() valueChanged: EventEmitter<string>;
  @Event({ bubbles: false }) internalUpdate: EventEmitter<void>;

  handleInput(e: InputEvent) {
    this.valueChanged.emit((e.target as HTMLInputElement).value);
    this.internalUpdate.emit();
  }

  render() {
    return <input onInput={(e) => this.handleInput(e)} />;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";
import { html } from "lit";

@Component({ tag: "my-input" })
export class MyInput extends KasstorElement {
  @Event() protected valueChanged!: EventEmitter<string>;
  @Event({ bubbles: false }) protected internalUpdate!: EventEmitter<void>;

  #handleInput = (e: InputEvent) => {
    const eventInfo = this.valueChanged.emit((e.target as HTMLInputElement).value);

    // You can check if a listener called preventDefault()
    if (eventInfo.defaultPrevented) {
      // Handle cancellation
    }

    this.internalUpdate.emit();
  };

  override render() {
    return html`<input @input=${this.#handleInput} />`;
  }
}
```

## `@Watch()` → `@Observe()`

Kasstor's `@Observe` replaces Stencil's `@Watch`. There is one critical difference: **`@Observe` fires before the first render** (if the initial value is not `undefined`), whereas Stencil's `@Watch` only fires on subsequent changes.

This eliminates a common Stencil pattern where you had to duplicate initialization logic in `connectedCallback` because `@Watch` did not run on the initial value.

- Import from `@genexus/kasstor-core/decorators/observe.js`.
- Add `protected` to the callback method.
- Can observe a single property or an array of properties.
- The callback receives `(newValue?, oldValue?)`.

**StencilJS:**

```tsx
import { Component, Prop, Watch, h } from "@stencil/core";

@Component({ tag: "my-tabs", shadow: true })
export class MyTabs {
  @Prop() selectedIndex: number = 0;
  @Prop() items: string[] = [];

  // Watch does NOT fire on the initial value in StencilJS.
  // You must duplicate logic in connectedCallback for initialization.
  connectedCallback() {
    this.validateIndex(this.selectedIndex);
  }

  @Watch("selectedIndex")
  validateIndex(newValue: number) {
    if (newValue < 0 || newValue >= this.items.length) {
      this.selectedIndex = 0;
    }
  }

  @Watch("items")
  onItemsChanged() {
    this.selectedIndex = 0;
  }

  render() {
    return <div>Tab: {this.selectedIndex}</div>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Observe } from "@genexus/kasstor-core/decorators/observe.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";

@Component({ tag: "my-tabs" })
export class MyTabs extends KasstorElement {
  @property({ type: Number }) selectedIndex: number = 0;
  @property({ attribute: false }) items: string[] = [];

  // Observe fires on the initial value too — no need for connectedCallback duplication
  @Observe("selectedIndex")
  protected validateIndex(newValue?: unknown) {
    const index = newValue as number;
    if (index < 0 || index >= this.items.length) {
      this.selectedIndex = 0;
    }
  }

  @Observe("items")
  protected onItemsChanged() {
    this.selectedIndex = 0;
  }

  override render() {
    return html`<div>Tab: ${this.selectedIndex}</div>`;
  }
}
```

You can also observe multiple properties with a single callback:

```ts
@Observe(["checked", "value"])
protected checkedOrValueChanged() {
  this.#updateFormValue();
}
```

## `@Method()` → Plain Class Methods

In StencilJS, `@Method()` exposes a public async API on the component. All `@Method` decorated methods are forced to be async, even when they don't need to be.

In Kasstor, there is no `@Method` decorator. Simply define a regular class method. It is **not** async by default — only mark it `async` if it actually performs asynchronous operations.

**StencilJS:**

```tsx
import { Component, Method, h } from "@stencil/core";

@Component({ tag: "my-dialog", shadow: true })
export class MyDialog {
  @Method()
  async open() {
    // Even though this is synchronous, Stencil forces it to be async
    this.isVisible = true;
  }

  @Method()
  async close() {
    this.isVisible = false;
  }

  render() {
    return <div>...</div>;
  }
}

// Consumer (Stencil):
// const dialog = document.querySelector("my-dialog");
// await dialog.open(); // Always returns a Promise
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { state } from "lit/decorators/state.js";

@Component({ tag: "my-dialog" })
export class MyDialog extends KasstorElement {
  @state() private isVisible: boolean = false;

  open() {
    this.isVisible = true;
  }

  close() {
    this.isVisible = false;
  }

  override render() {
    return html`<div>...</div>`;
  }
}

// Consumer (Kasstor):
// const dialog = document.querySelector("my-dialog");
// dialog.open(); // Synchronous — no unnecessary Promise wrapping
```

## `@Listen()` → Manual Event Listeners

There is no `@Listen` decorator in Kasstor. Add event listeners in `connectedCallback()` and remove them in `disconnectedCallback()`.

**StencilJS:**

```tsx
import { Component, Listen, h } from "@stencil/core";

@Component({ tag: "my-shortcuts", shadow: true })
export class MyShortcuts {
  @Listen("keydown", { target: "window" })
  handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      this.close();
    }
  }

  @Listen("click")
  handleClick() {
    // Listens on the host element
    this.toggle();
  }

  render() {
    return <div>...</div>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "my-shortcuts" })
export class MyShortcuts extends KasstorElement {
  #handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      this.close();
    }
  };

  #handleClick = () => {
    this.toggle();
  };

  override connectedCallback() {
    super.connectedCallback(); // Always call super first
    window.addEventListener("keydown", this.#handleKeyDown);
    this.addEventListener("click", this.#handleClick);
  }

  override disconnectedCallback() {
    window.removeEventListener("keydown", this.#handleKeyDown);
    this.removeEventListener("click", this.#handleClick);
    super.disconnectedCallback(); // Always call super last
  }

  override render() {
    return html`<div>...</div>`;
  }
}
```

> **Important:** Use arrow functions or private class fields for handlers so that `this` is correctly bound. Always call `super.connectedCallback()` and `super.disconnectedCallback()`.

## `ElementInternals`

In StencilJS, you use the `@AttachInternals` decorator and `formAssociated: true` at the component level. In Kasstor, call `this.attachInternals()` directly and set `formAssociated` inside the `shadow` option.

**StencilJS:**

```tsx
import { AttachInternals, Component, Prop, h } from "@stencil/core";

@Component({
  tag: "my-checkbox",
  shadow: true,
  formAssociated: true
})
export class MyCheckbox {
  @AttachInternals() internals!: ElementInternals;
  @Prop({ mutable: true }) checked: boolean = false;
  @Prop() value: string = "on";

  componentWillLoad() {
    this.internals.setFormValue(this.checked ? this.value : null);
  }

  render() {
    return <div>...</div>;
  }
}
```

**Kasstor:**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";

@Component({
  tag: "my-checkbox",
  shadow: { formAssociated: true }
})
export class MyCheckbox extends KasstorElement {
  #internals = this.attachInternals();

  @property({ type: Boolean }) checked: boolean = false;
  @property() value: string = "on";

  protected override firstWillUpdate() {
    this.#internals.setFormValue(this.checked ? this.value : null);
  }

  override render() {
    return html`<div>...</div>`;
  }
}
```

Key differences:

- No `@AttachInternals` decorator — call `this.attachInternals()` directly as a class field.
- `formAssociated` is placed inside `shadow: { formAssociated: true }` in the `@Component` decorator.
- Use `firstWillUpdate()` instead of `componentWillLoad()` for initialization.

---

**Next:** [Lifecycle](./04-lifecycle.md)
