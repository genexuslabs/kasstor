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

  @Prop() label: string = "";
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop({ mutable: true }) value: string = "";
  @Prop() placeholder: string = "Enter text...";
  @Prop() maxLength: number = 100;
  @Prop() items: string[] = [];

  // ---------- Internal State ----------

  @State() isFocused: boolean = false;
  @State() errorMessage: string | undefined;

  // ---------- Events ----------

  @Event() valueChange: EventEmitter<string>;
  @Event({ bubbles: false }) fieldFocus: EventEmitter<void>;
  @Event({ bubbles: false }) fieldBlur: EventEmitter<void>;

  // ---------- Watchers ----------

  // Does NOT fire on initial value — must duplicate in connectedCallback
  @Watch("value")
  onValueChanged(newValue: string) {
    this.internals.setFormValue(newValue);
    this.validate(newValue);
  }

  @Watch("disabled")
  onDisabledChanged(newValue: boolean) {
    if (newValue) {
      this.isFocused = false;
    }
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

  @Method()
  async reset() {
    this.value = "";
    this.errorMessage = undefined;
    this.internals.setFormValue("");
  }

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
        {this.label && <label>{this.label}</label>}

        <input
          type="text"
          disabled={this.disabled}
          placeholder={this.placeholder}
          value={this.value}
          onInput={this.handleInput}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        />

        {this.errorMessage && (
          <span class="error">{this.errorMessage}</span>
        )}

        {this.items.length > 0 && (
          <Fragment>
            <hr />
            <ul>
              {this.items.map((item) => (
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
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import {
  Event,
  type EventEmitter
} from "@genexus/kasstor-core/decorators/event.js";
import { Observe } from "@genexus/kasstor-core/decorators/observe.js";
import { html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators/property.js";
import { query } from "lit/decorators/query.js";
import { state } from "lit/decorators/state.js";
import { classMap } from "lit/directives/class-map.js";

import styles from "./my-form-field.scss?inline";

@Component({
  tag: "my-form-field",
  styles,
  shadow: { formAssociated: true }
})
export class MyFormField extends KasstorElement {
  // ElementInternals — no decorator needed, just call attachInternals()
  #internals = this.attachInternals();

  // Ref to the inner input — replaces @Element + shadowRoot query
  @query("input") private inputEl!: HTMLInputElement;

  // ---------- Properties ----------

  @property() label: string = "";
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property() value: string = "";
  @property() placeholder: string = "Enter text...";
  @property({ attribute: "max-length", type: Number }) maxLength: number = 100;
  @property({ attribute: false }) items: string[] = [];

  // ---------- Internal State ----------

  @state() private isFocused: boolean = false;
  @state() private errorMessage: string | undefined;

  // ---------- Events ----------

  @Event() protected valueChange!: EventEmitter<string>;
  @Event({ bubbles: false }) protected fieldFocus!: EventEmitter<void>;
  @Event({ bubbles: false }) protected fieldBlur!: EventEmitter<void>;

  // ---------- Observers (replace @Watch) ----------

  // Fires on initial value AND subsequent changes — no connectedCallback duplication
  @Observe("value")
  protected onValueChanged(newValue?: unknown) {
    this.#internals.setFormValue(newValue as string);
    this.#validate(newValue as string);
  }

  @Observe("disabled")
  protected onDisabledChanged(newValue?: unknown) {
    if (newValue as boolean) {
      this.isFocused = false;
    }
  }

  // ---------- Event Listeners (replace @Listen) ----------

  #handleGlobalKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && this.isFocused) {
      this.inputEl?.blur();
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
    // Clean up listeners before calling super
    window.removeEventListener("keydown", this.#handleGlobalKeyDown);
    super.disconnectedCallback(); // Always call super last
  }

  protected override firstWillUpdate(): void {
    // Replaces componentWillLoad — runs once before first render
    console.log("First will update — runs once before first render");
  }

  override firstUpdated(): void {
    // Replaces componentDidLoad — DOM is ready
    // `this` is the host element — no need for @Element
    console.log("First updated — DOM is ready:", this.offsetHeight);
  }

  override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties); // Always call super
    // Replaces componentWillRender
    console.log("Will update");
  }

  override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties); // Always call super
    // Replaces componentDidRender
    console.log("Updated");
  }

  // ---------- Public Methods (no @Method decorator needed) ----------

  reset() {
    this.value = "";
    this.errorMessage = undefined;
    this.#internals.setFormValue("");
  }

  override focus() {
    this.inputEl?.focus();
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
      ${this.label ? html`<label>${this.label}</label>` : nothing}

      <input
        type="text"
        ?disabled=${this.disabled}
        placeholder=${this.placeholder}
        .value=${this.value}
        @input=${this.#handleInput}
        @focus=${this.#handleFocus}
        @blur=${this.#handleBlur}
      />

      ${this.errorMessage
        ? html`<span class="error">${this.errorMessage}</span>`
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

| # | What Changed | Why |
| --- | --- | --- |
| 1 | File extension `.tsx` → `.lit.ts` | Required for Vite plugin HMR and build analysis |
| 2 | `extends KasstorElement` | All Kasstor components must extend this base class |
| 3 | `import styles from "./x.scss?inline"` | Styles are imported as strings, not referenced by path |
| 4 | `shadow: { formAssociated: true }` | `formAssociated` is inside the `shadow` option |
| 5 | `#internals = this.attachInternals()` | No `@AttachInternals` decorator — direct call |
| 6 | `@query("input")` | Replaces `@Element` + manual shadow DOM query |
| 7 | `@property({ type: Number })` | Must specify `type` for non-string properties |
| 8 | `@property({ attribute: false })` | For arrays/objects, disable attribute handling |
| 9 | `@state() private` | Must add access modifier for strict TypeScript |
| 10 | `@Event() protected ... !: EventEmitter<T>` | Different import, `protected`, and `!` for strict TS |
| 11 | `@Observe("value")` replaces `@Watch("value")` | Fires on initial value too — no `connectedCallback` duplication |
| 12 | Manual `addEventListener`/`removeEventListener` | Replaces `@Listen` decorator |
| 13 | `super.connectedCallback()` / `super.disconnectedCallback()` | Must always call `super` on lifecycle overrides |
| 14 | `firstWillUpdate()` | Replaces `componentWillLoad` |
| 15 | `firstUpdated()` | Replaces `componentDidLoad` |
| 16 | `willUpdate()` / `updated()` | Replace `componentWillRender` / `componentDidRender` |
| 17 | Plain methods (no `@Method`) | Not async by default |
| 18 | `html\`...\`` with `@click`, `?disabled`, `.value` | Lit bindings replace JSX |
| 19 | `nothing` instead of conditional JSX | Avoids empty text nodes |
| 20 | `<slot></slot>` (explicit close tag) | Self-closing `<slot />` not valid in Lit templates |
| 21 | Host class management in `render()` or `@Observe` | No `<Host>` component — use imperative DOM API |

---

**Back to:** [Migration Guide](./README.md)
