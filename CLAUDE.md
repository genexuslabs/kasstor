# Kasstor Component Style Guide

This file contains coding conventions for Kasstor web components. These rules apply when writing or reviewing component code and documentation.

## Member Ordering

Inside a `KasstorElement` class, members must appear in this order:

1. **Private fields** — `attachInternals()`, private class fields (e.g. `#internals = this.attachInternals()`)
2. **`@state()` declarations** — before `@property()`, in alphabetical order
3. **`@property()` declarations** — in alphabetical order
   - Each `@Observe` method goes **immediately after** the property it observes (inline pair, not a separate section)
4. **`@Event()` declarations** — in alphabetical order
5. **Public methods** — no `@Method` decorator needed
6. **Private event listener arrow functions** — `#handleXxx = (e) => { ... }`
7. **Lifecycle methods**:
   - `connectedCallback` + `disconnectedCallback` as a **setup/teardown pair** first
   - Then render lifecycle in execution order: `firstWillUpdate` → `willUpdate` → `firstUpdated` → `updated`
8. **Private helper methods**
9. **`render()`** — always last

### Example skeleton

```ts
export class MyComponent extends KasstorElement {
  // 1. Private fields
  #internals = this.attachInternals();
  #someRef = createRef<HTMLElement>();

  // 2. State (alphabetical)
  /** ... */
  @state() private errorMessage: string | undefined;
  /** ... */
  @state() private isOpen: boolean = false;

  // 3. Properties (alphabetical, each @Observe immediately after its property)
  /** ... */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  @Observe("disabled")
  protected onDisabledChanged(newValue?: unknown) { ... }

  /** ... */
  @property() value: string = "";

  @Observe("value")
  protected onValueChanged(newValue?: unknown) { ... }

  // 4. Events (alphabetical)
  /** ... */
  @Event() protected valueChange!: EventEmitter<string>;

  // 5. Public methods
  /** ... */
  reset() { ... }

  // 6. Private event listener arrow functions
  #handleGlobalKeyDown = (ev: KeyboardEvent) => { ... };

  // 7. Lifecycle — setup/teardown pair, then render lifecycle
  override connectedCallback() { super.connectedCallback(); ... }
  override disconnectedCallback() { super.disconnectedCallback(); ... }
  protected override firstWillUpdate(): void { ... }
  override willUpdate(changed: PropertyValues): void { super.willUpdate(changed); ... }
  override firstUpdated(changed: PropertyValues): void { ... }
  override updated(changed: PropertyValues): void { super.updated(changed); ... }

  // 8. Private helpers
  #validate(value: string) { ... }

  // 9. Render — always last
  override render() {
    return html`...`;
  }
}
```

---

## JSDoc Requirements

All public API members must have JSDoc documentation:

- **`@property()`** — describe what the property controls and its effect
- **`@state()`** — describe what internal state it tracks
- **`@Event()`** — describe when it fires and what the `detail` contains
- **Public methods** — describe what the method does, parameters, and return value
- **CSS parts** — use `@part name - description` tags on the class-level JSDoc
- **Slots** — use `@slot name - description` tags on the class-level JSDoc; use `@slot` (no name) for the default slot

### Example

```ts
/**
 * A form input field with validation and customizable appearance.
 *
 * @slot - Default slot for additional content rendered below the input.
 *
 * @part input - The underlying `<input>` element.
 * @part label - The `<label>` element rendered above the input.
 * @part error - The error message shown when validation fails.
 */
@Component({ tag: "my-field" })
export class MyField extends KasstorElement {
  /** Current validation error message, or `undefined` if valid. */
  @state() private errorMessage: string | undefined;

  /** Disables the field, preventing user interaction. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  /** Fired when the value changes. Detail is the new string value. */
  @Event() protected valueChange!: EventEmitter<string>;

  /** Resets the value and clears any validation error. */
  reset() { ... }
}
```

---

## DOM References

Always use `createRef` + the `ref` directive for DOM references. **Never use `@query`.**

```ts
// ✅ Correct
import { createRef, ref } from "lit/directives/ref.js";

#inputRef = createRef<HTMLInputElement>();

override render() {
  return html`<input ${ref(this.#inputRef)} />`;
}

someMethod() {
  this.#inputRef.value?.focus();
}

// ❌ Wrong — do not use @query
@query("input") private inputEl!: HTMLInputElement;
```

---

## CSS Parts

Expose styleable internal elements using the `part=""` HTML attribute. Document each part with a `@part name - description` JSDoc tag on the class.

```ts
/**
 * @part input - The underlying `<input>` element.
 * @part label - The label element.
 */
@Component({ tag: "my-field" })
export class MyField extends KasstorElement {
  override render() {
    return html`
      <label part="label">${this.label}</label>
      <input part="input" type="text" />
    `;
  }
}
```

Consumers can then style individual parts without piercing the shadow DOM:

```css
my-field::part(input) {
  border-radius: 8px;
}
```
