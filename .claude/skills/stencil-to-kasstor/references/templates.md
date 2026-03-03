# Templates

This page covers migrating from StencilJS JSX templates to Lit's `html` tagged template literals.

## JSX → `html` Tagged Template Literals

Lit uses the `html` tag function instead of JSX. The rendering engine is fundamentally different: Lit does not use a virtual DOM. Instead, it creates a static template once and then only updates the dynamic expressions (the `${...}` parts), making it very efficient.

```ts
import { html, nothing } from "lit";
```

### Basic Text and Expressions

**StencilJS:**

```tsx
render() {
  return <p>Hello, {this.name}!</p>;
}
```

**Kasstor:**

```ts
override render() {
  return html`<p>Hello, ${this.name}!</p>`;
}
```

## Self-Closing Tags

In JSX (StencilJS), any element can use the self-closing syntax (`<slot />`). However, Lit templates use the **standard HTML parser**, which only allows [void elements](https://developer.mozilla.org/en-US/docs/Glossary/Void_element) to self-close. Non-void elements **must** have an explicit closing tag.

**Void elements** (self-closing is valid):

```ts
// ✅ Correct — these are void elements
html`<input type="text" />`;
html`<br />`;
html`<img src="logo.png" />`;
html`<hr />`;
```

**Non-void elements** (self-closing is **not** valid):

```ts
// ❌ Wrong — the HTML parser will NOT close these automatically
html`<slot />`;
html`<my-component />`;
html`<div />`;

// ✅ Correct — always use explicit closing tags
html`<slot></slot>`;
html`<my-component></my-component>`;
html`<div></div>`;
```

> When migrating from StencilJS, search for self-closing non-void elements (e.g., `<slot />`, `<my-component />`) and replace them with explicit closing tags.

## Binding Types

Lit provides several binding prefixes that give you precise control over how values are applied to the DOM:

### Attribute Binding

Sets an HTML attribute. This is the default binding (no prefix).

**StencilJS:**

```tsx
<input type="text" id={this.inputId} />
```

**Kasstor:**

```ts
html`<input type="text" id=${this.inputId} />`;
```

### Boolean Attribute Binding (`?`)

Adds the attribute when truthy, removes it when falsy. Use the `?` prefix.

**StencilJS:**

```tsx
<button disabled={this.isDisabled}>Click</button>
```

**Kasstor:**

```ts
html`<button ?disabled=${this.isDisabled}>Click</button>`;
```

### Property Binding (`.`)

Sets a JavaScript property on the element (not an HTML attribute). Use the `.` prefix. Essential for passing objects, arrays, or complex values.

**StencilJS:**

```tsx
<my-list items={this.listItems} />
```

**Kasstor:**

```ts
html`<my-list .items=${this.listItems}></my-list>`;
```

### Event Binding (`@`)

Attaches an event listener. Use the `@` prefix.

**StencilJS:**

```tsx
<button onClick={(e) => this.handleClick(e)}>Click</button>
<input onInput={(e) => this.handleInput(e)} />
```

**Kasstor:**

```ts
html`
  <button @click=${this.#handleClick}>Click</button>
  <input @input=${this.#handleInput} />
`;
```

> **Tip:** Use private class fields (arrow functions) for event handlers to ensure correct `this` binding:
>
> ```ts
> #handleClick = (e: MouseEvent) => { ... };
> ```

### Summary Table

| Binding           | Stencil JSX                       | Lit `html`          |
| ----------------- | --------------------------------- | ------------------- |
| Attribute         | `id={val}`                        | `id=${val}`         |
| Boolean attribute | `disabled={bool}`                 | `?disabled=${bool}` |
| Property          | `items={arr}` or `.items={arr}`   | `.items=${arr}`     |
| Event             | `onClick={fn}` or `on-click={fn}` | `@click=${fn}`      |

## Conditionals

**StencilJS:**

```tsx
render() {
  return (
    <div>
      {this.isLoading ? <span>Loading...</span> : <span>Done</span>}
      {this.showExtra && <p>Extra content</p>}
    </div>
  );
}
```

**Kasstor:**

```ts
override render() {
  return html`
    <div>
      ${this.isLoading ? html`<span>Loading...</span>` : html`<span>Done</span>`}
      ${this.showExtra ? html`<p>Extra content</p>` : nothing}
    </div>
  `;
}
```

> While `nothing`, `null`, `undefined`, and `""` all result in no rendered output, `nothing` (imported from `lit`) is the recommended option because it is the most efficient check internally (first branch in Lit's rendering logic) and can be minified to a single character.

## Loops

**StencilJS:**

```tsx
render() {
  return (
    <ul>
      {this.items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

**Kasstor:**

```ts
override render() {
  return html`
    <ul>
      ${this.items.map(item => html`<li>${item.name}</li>`)}
    </ul>
  `;
}
```

For keyed lists (efficient reordering), use Lit's `repeat` directive:

```ts
import { repeat } from "lit/directives/repeat.js";

override render() {
  return html`
    <ul>
      ${repeat(this.items, item => item.id, item => html`<li>${item.name}</li>`)}
    </ul>
  `;
}
```

## Class and Style Bindings

### Classes

**StencilJS:**

```tsx
<div class={{ active: this.isActive, disabled: this.isDisabled }}>...</div>
```

**Kasstor:**

```ts
import { classMap } from "lit/directives/class-map.js";

html`<div class=${classMap({ active: this.isActive, disabled: this.isDisabled })}>...</div>`;
```

### Styles

**StencilJS:**

```tsx
<div style={{ color: this.textColor, "font-size": "14px" }}>...</div>
```

**Kasstor:**

```ts
import { styleMap } from "lit/directives/style-map.js";

html`<div style=${styleMap({ color: this.textColor, "font-size": "14px" })}>...</div>`;
```

## Slots

Slots work the same way in both Stencil and Lit — they are a native web component feature. The only difference is syntax: Lit uses `html` instead of JSX.

**StencilJS:**

```tsx
render() {
  return (
    <div>
      <slot />
      <slot name="header" />
    </div>
  );
}
```

**Kasstor:**

```ts
override render() {
  return html`
    <div>
      <slot></slot>
      <slot name="header"></slot>
    </div>
  `;
}
```

> **Note:** Remember that `<slot />` is not valid in Lit templates — see the [Self-Closing Tags](#self-closing-tags) section above.

## Fragments (Multiple Root Elements)

**StencilJS:**

```tsx
import { Fragment, h } from "@stencil/core";

render() {
  return (
    <Fragment>
      <h1>Title</h1>
      <p>Content</p>
    </Fragment>
  );
}
```

**Kasstor:**

Lit supports multiple root elements natively — no Fragment component needed:

```ts
override render() {
  return html`
    <h1>Title</h1>
    <p>Content</p>
  `;
}
```

## Refs

**StencilJS:**

```tsx
private inputEl!: HTMLInputElement;

render() {
  return <input ref={(el) => this.inputEl = el as HTMLInputElement} />;
}
```

**Kasstor:**

```ts
import { createRef, ref } from "lit/directives/ref.js";

#inputRef = createRef<HTMLInputElement>();

override render() {
  return html`<input ${ref(this.#inputRef)} />`;
}
```

In Stencil, the `ref` callback gives you the element directly. In Lit, `createRef()` returns a `Ref` object — you must access the element through its `.value` property:

```ts
// StencilJS — direct reference
this.inputEl.focus();

// Lit — access via .value
this.#inputRef.value?.focus();
```

## Migrating `<Host>`

StencilJS's `<Host>` virtual component let you set attributes, classes, and event listeners on the host element declaratively in `render()`. There is no equivalent in Lit. Instead, apply these imperatively.

### StencilJS

```tsx
import { Component, Host, Prop, h } from "@stencil/core";

@Component({ tag: "my-panel", shadow: true })
export class MyPanel {
  @Prop() open: boolean = false;
  @Prop() role: string = "region";

  render() {
    return (
      <Host
        role={this.role}
        aria-hidden={String(!this.open)}
        class={{ "is-open": this.open, panel: true }}
      >
        <slot />
      </Host>
    );
  }
}
```

### Kasstor

For **static** attributes (set once and never change), apply them in `connectedCallback`. For **dynamic** attributes that depend on reactive properties, use `@Observe` to keep them in sync:

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Observe } from "@genexus/kasstor-core/decorators/observe.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";

@Component({ tag: "my-panel" })
export class MyPanel extends KasstorElement {
  @property({ type: Boolean }) open: boolean = false;
  @property() override role: string = "region";

  override connectedCallback() {
    super.connectedCallback();
    // Static: set once
    this.classList.add("panel");
  }

  // Dynamic: update when `open` changes (also fires on initial value)
  @Observe("open")
  protected onOpenChanged(newValue?: unknown) {
    const isOpen = newValue as boolean;
    this.setAttribute("aria-hidden", String(!isOpen));
    this.classList.toggle("is-open", isOpen);
  }

  override render() {
    return html`<slot></slot>`;
  }
}
```

> **Tip:** For the `role` attribute, since it is a reflected `@property`, it will be set as an attribute automatically if you configure it with `@property({ reflect: true })`. You can also simply set it as a default attribute in the HTML or via `connectedCallback`.

## `forceUpdate` → `requestUpdate`

**StencilJS:**

```tsx
import { forceUpdate } from "@stencil/core";

// Force a re-render
forceUpdate(this);
```

**Kasstor:**

```ts
// Enqueue a re-render
this.requestUpdate();
```

In Lit, `requestUpdate()` is a method on the element itself. You can also call it on any element reference: `someElement.requestUpdate()`.

---

**Next:** [Signals and Store](./06-signals-store.md)

