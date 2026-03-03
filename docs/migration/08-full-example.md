# Full Migration Example

This page shows a comprehensive StencilJS component that uses most Stencil features, and the equivalent Kasstor component after migration.

## StencilJS — Before

**my-form-field.tsx**

```tsx
import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Fragment,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  forceUpdate,
  h
} from "@stencil/core";

/**
 * A text input field with label, validation, form association, and customizable appearance.
 *
 * @slot - Default slot for additional content rendered below the input.
 *
 * @part input - The underlying `<input>` element.
 * @part label - The `<label>` element rendered above the input.
 * @part error - The error message element shown when validation fails.
 */
@Component({
  tag: "my-form-field",
  styleUrl: "./my-form-field.scss",
  shadow: true,
  formAssociated: true
})
export class MyFormField {
  @Element() el!: HTMLMyFormFieldElement;
  @AttachInternals() internals!: ElementInternals;

  // ---------- Properties ----------

  /** Disables the field, preventing user interaction. */
  @Prop({ reflect: true }) disabled: boolean = false;

  /** List of items to render below the input. */
  @Prop() items: string[] = [];

  /** Visible label rendered above the input. */
  @Prop() label: string = "";

  /** Maximum number of characters allowed. Triggers a validation error when exceeded. */
  @Prop() maxLength: number = 100;

  /** Placeholder text shown when the input is empty. */
  @Prop() placeholder: string = "Enter text...";

  /** Current value of the input. */
  @Prop({ mutable: true }) value: string = "";

  // ---------- Internal State ----------

  /** Current validation error message, or `undefined` if the value is valid. */
  @State() errorMessage: string | undefined;

  /** Whether the field is currently focused. */
  @State() isFocused: boolean = false;

  // ---------- Events ----------

  /** Fired when focus leaves the field. */
  @Event({ bubbles: false }) fieldBlur: EventEmitter<void>;

  /** Fired when the field receives focus. */
  @Event({ bubbles: false }) fieldFocus: EventEmitter<void>;

  /** Fired when the value changes. Detail is the new string value. */
  @Event() valueChange: EventEmitter<string>;

  // ---------- Watchers ----------

  // Does NOT fire on initial value — must duplicate in connectedCallback
  @Watch("disabled")
  onDisabledChanged(newValue: boolean) {
    if (newValue) {
      this.isFocused = false;
    }
  }

  @Watch("value")
  onValueChanged(newValue: string) {
    this.internals.setFormValue(newValue);
    this.validate(newValue);
  }

  // ---------- Listeners ----------

  @Listen("keydown", { target: "window" })
  handleGlobalKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Escape" && this.isFocused) {
      this.blur();
    }
  }

  // ---------- Lifecycle ----------

  connectedCallback() {
    // Duplicate watcher logic for initial value
    this.internals.setFormValue(this.value);
    this.validate(this.value);
    this.el.setAttribute("role", "textbox");
  }

  componentWillLoad() {
    console.log("Component will load — runs once before first render");
  }

  componentDidLoad() {
    console.log("Component did load — DOM is ready:", this.el.offsetHeight);
  }

  componentWillRender() {
    console.log("Will render");
  }

  componentDidRender() {
    console.log("Did render");
  }

  // ---------- Public Methods ----------

  /** Resets the value, clears validation state, and updates the form value. */
  @Method()
  async reset() {
    this.value = "";
    this.errorMessage = undefined;
    this.internals.setFormValue("");
  }

  /** Focuses the inner input element. */
  @Method()
  async focus() {
    const input = this.el.shadowRoot!.querySelector("input");
    input?.focus();
  }

  // ---------- Private Methods ----------

  private validate(value: string) {
    if (value.length > this.maxLength) {
      this.errorMessage = `Max ${this.maxLength} characters`;
    } else {
      this.errorMessage = undefined;
    }
  }

  private handleInput = (e: InputEvent) => {
    const oldValue = this.value;
    this.value = (e.target as HTMLInputElement).value;

    const event = this.valueChange.emit(this.value);
    if (event.defaultPrevented) {
      this.value = oldValue;
    }
  };

  private handleFocus = () => {
    this.isFocused = true;
    this.fieldFocus.emit();
  };

  private handleBlur = () => {
    this.isFocused = false;
    this.fieldBlur.emit();
  };

  private blur() {
    const input = this.el.shadowRoot!.querySelector("input");
    input?.blur();
  }

  // ---------- Render ----------

  render() {
    return (
      <Host
        class={{
          "is-focused": this.isFocused,
          "has-error": !!this.errorMessage,
          "is-disabled": this.disabled
        }}
        aria-disabled={String(this.disabled)}
      >
        {this.label && <label part="label">{this.label}</label>}

        <input
          part="input"
          disabled={this.disabled}
          placeholder={this.placeholder}
          type="text"
          value={this.value}
          onInput={this.handleInput}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        />

        {this.errorMessage && (
          <span part="error" class="error">
            {this.errorMessage}
          </span>
        )}

        {this.items.length > 0 && (
          <Fragment>
            <hr />
            <ul>
              {this.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Fragment>
        )}

        <slot />
      </Host>
    );
  }
}
```

## Kasstor — After

**my-form-field.lit.ts**

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";
import { Observe } from "@genexus/kasstor-core/decorators/observe.js";
import { html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";
import { classMap } from "lit/directives/class-map.js";
import { createRef, ref } from "lit/directives/ref.js";

import styles from "./my-form-field.scss?inline";

/**
 * A text input field with label, validation, form association, and customizable appearance.
 *
 * @slot - Default slot for additional content rendered below the input.
 *
 * @part input - The underlying `<input>` element.
 * @part label - The `<label>` element rendered above the input.
 * @part error - The error message element shown when validation fails.
 */
@Component({
  tag: "my-form-field",
  styles,
  shadow: { formAssociated: true }
})
export class MyFormField extends KasstorElement {
  // ElementInternals — no decorator needed, just call attachInternals()
  #internals = this.attachInternals();

  // Ref to the inner input — replaces @Element + shadowRoot query
  #inputRef = createRef<HTMLInputElement>();

  // ---------- Internal State ----------

  /** Current validation error message, or `undefined` if the value is valid. */
  @state() private errorMessage: string | undefined;

  /** Whether the field is currently focused. */
  @state() private isFocused: boolean = false;

  // ---------- Properties ----------

  /** Disables the field, preventing user interaction. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  // Fires on initial value AND subsequent changes — no connectedCallback duplication
  @Observe("disabled")
  protected onDisabledChanged(newValue?: unknown) {
    if (newValue as boolean) {
      this.isFocused = false;
    }
  }

  /** List of items to render below the input. */
  @property({ attribute: false }) items: string[] = [];

  /** Visible label rendered above the input. */
  @property() label: string = "";

  /** Maximum number of characters allowed. Triggers a validation error when exceeded. */
  @property({ attribute: "max-length", type: Number }) maxLength: number = 100;

  /** Placeholder text shown when the input is empty. */
  @property() placeholder: string = "Enter text...";

  /** Current value of the input. */
  @property() value: string = "";

  @Observe("value")
  protected onValueChanged(newValue?: unknown) {
    this.#internals.setFormValue(newValue as string);
    this.#validate(newValue as string);
  }

  // ---------- Events ----------

  /** Fired when focus leaves the field. */
  @Event({ bubbles: false }) protected fieldBlur!: EventEmitter<void>;

  /** Fired when the field receives focus. */
  @Event({ bubbles: false }) protected fieldFocus!: EventEmitter<void>;

  /** Fired when the value changes. Detail is the new string value. */
  @Event() protected valueChange!: EventEmitter<string>;

  // ---------- Public Methods ----------

  /** Resets the value, clears validation state, and updates the form value. */
  reset() {
    this.value = "";
    this.errorMessage = undefined;
    this.#internals.setFormValue("");
  }

  /** Focuses the inner input element. */
  override focus() {
    this.#inputRef.value?.focus();
  }

  // ---------- Private Event Listeners ----------

  #handleGlobalKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && this.isFocused) {
      this.#inputRef.value?.blur();
    }
  };

  // ---------- Lifecycle ----------

  override connectedCallback() {
    super.connectedCallback(); // Always call super first

    // Static host attributes (replaces Host role)
    this.setAttribute("role", "textbox");

    // Manual event listeners (replaces @Listen with target: "window")
    window.addEventListener("keydown", this.#handleGlobalKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.#handleGlobalKeyDown);
  }

  protected override firstWillUpdate(): void {
    // Replaces componentWillLoad — runs once before first render
    console.log("First will update — runs once before first render");
  }

  override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties); // Always call super
    // Replaces componentWillRender
    console.log("Will update");
  }

  override firstUpdated(changedProperties: PropertyValues): void {
    // Replaces componentDidLoad — DOM is ready
    // `this` is the host element — no need for @Element
    console.log("First updated — DOM is ready:", this.offsetHeight);
  }

  override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties); // Always call super
    // Replaces componentDidRender
    console.log("Updated");
  }

  // ---------- Private Methods ----------

  #validate(value: string) {
    if (value.length > this.maxLength) {
      this.errorMessage = `Max ${this.maxLength} characters`;
    } else {
      this.errorMessage = undefined;
    }
  }

  #handleInput = (e: InputEvent) => {
    const oldValue = this.value;
    this.value = (e.target as HTMLInputElement).value;

    const eventInfo = this.valueChange.emit(this.value);
    if (eventInfo.defaultPrevented) {
      this.value = oldValue;
    }
  };

  #handleFocus = () => {
    this.isFocused = true;
    this.fieldFocus.emit();
  };

  #handleBlur = () => {
    this.isFocused = false;
    this.fieldBlur.emit();
  };

  // ---------- Render ----------

  override render() {
    // Dynamic host classes (replaces Host class binding)
    this.classList.toggle("is-focused", this.isFocused);
    this.classList.toggle("has-error", !!this.errorMessage);
    this.classList.toggle("is-disabled", this.disabled);
    this.setAttribute("aria-disabled", String(this.disabled));

    return html`
      ${this.label ? html`<label part="label">${this.label}</label>` : nothing}

      <input
        part="input"
        ${ref(this.#inputRef)}
        ?disabled=${this.disabled}
        placeholder=${this.placeholder}
        type="text"
        .value=${this.value}
        @input=${this.#handleInput}
        @focus=${this.#handleFocus}
        @blur=${this.#handleBlur}
      />

      ${this.errorMessage
        ? html`<span part="error" class="error">${this.errorMessage}</span>`
        : nothing}
      ${this.items.length > 0
        ? html`
            <hr />
            <ul>
              ${this.items.map(item => html`<li>${item}</li>`)}
            </ul>
          `
        : nothing}

      <slot></slot>
    `;
  }
}
```

## Summary of All Changes

| #   | What Changed                                                 | Why                                                                        |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | File extension `.tsx` → `.lit.ts`                            | Required for Vite plugin HMR and build analysis                            |
| 2   | `extends KasstorElement`                                     | All Kasstor components must extend this base class                         |
| 3   | `import styles from "./x.scss?inline"`                       | Styles are imported as strings, not referenced by path                     |
| 4   | `shadow: { formAssociated: true }`                           | `formAssociated` is inside the `shadow` option                             |
| 5   | `#internals = this.attachInternals()`                        | No `@AttachInternals` decorator — direct call                              |
| 6   | `createRef` + `ref` directive                                | Replaces `@Element` + manual shadow DOM query; always prefer over `@query` |
| 7   | `@state()` before `@property()`, both alphabetical           | Kasstor style guide: state first, then properties, alphabetical            |
| 8   | `@Observe` inline after its property                         | Each observer is co-located with the property it reacts to                 |
| 9   | `@property({ type: Number })`                                | Must specify `type` for non-string properties                              |
| 10  | `@property({ attribute: false })`                            | For arrays/objects, disable attribute handling                             |
| 11  | `@state() private`                                           | Must add access modifier for strict TypeScript                             |
| 12  | `@Event() protected ... !: EventEmitter<T>`                  | Different import, `protected`, and `!` for strict TS                       |
| 13  | `@Observe` replaces `@Watch`                                 | Fires on initial value too — no `connectedCallback` duplication            |
| 14  | Manual `addEventListener`/`removeEventListener`              | Replaces `@Listen` decorator                                               |
| 15  | `super.connectedCallback()` / `super.disconnectedCallback()` | Must always call `super` on lifecycle overrides                            |
| 16  | `firstWillUpdate()`                                          | Replaces `componentWillLoad`                                               |
| 17  | `firstUpdated()`                                             | Replaces `componentDidLoad`                                                |
| 18  | `willUpdate()` / `updated()`                                 | Replace `componentWillRender` / `componentDidRender`                       |
| 19  | Plain methods (no `@Method`)                                 | Not async by default                                                       |
| 20  | `html\`...\``with`@click`, `?disabled`, `.value`             | Lit bindings replace JSX                                                   |
| 21  | `nothing` instead of conditional JSX                         | Avoids empty text nodes                                                    |
| 22  | `<slot></slot>` (explicit close tag)                         | Self-closing `<slot />` not valid in Lit templates                         |
| 23  | Host class management in `render()` or `@Observe`            | No `<Host>` component — use imperative DOM API                             |
| 24  | JSDoc on all public members and class                        | Required: documents the public API and enables tooling                     |
| 25  | `part=""` attributes on customizable elements                | Exposes internal elements for CSS customization via `::part()`             |

---

**Back to:** [Migration Guide](./README.md)

