# @genexus/kasstor-core

A set of decorators and directives to enhance Lit components with powerful features for building web component libraries and applications.

## Table of Contents

- [Installation](#installation)
- [API](#api)
  - [Decorators](#decorators)
    - [`Component`](#component)
    - [`Event`](#event)
    - [`Observe`](#observe)
  - [Directives](#directives)
    - [`lazyLoad`](#lazyload)
    - [`renderByPlatform`](#renderbyplatform)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Installation

```bash
npm i @genexus/kasstor-core
```

## API

### Decorators

Decorators are applied to classes and class members to define Kasstor custom elements, typed custom events, and reactive side effects. They are the main building blocks for components in this library.

#### `Component`

The `@Component` decorator is used to define a Kasstor custom element with support for advanced configuration.

#### Features

- It automatically registers the custom element.

- Shadow Root configuration (open/close mode, formAssociated, and delegatesFocus).

- Better support for SSR in the components.

- Support for styling components with SCSS/SASS.

- Support for styling components without Shadow DOM.

- Adds the `firstWillUpdate` life cycle method which works with SSR.

- Adds support for the `Observe` decorator.

- Support to define global styles outside of the component that work with and without Shadow DOM.

- Support for HMR by using the `@genexus/vite-plugin-kasstor` package.

- Improved initial rendering performance (compared by only extending the `LitElement`) by reducing the Total Blocking Time (TBT) in scenarios where many components are initially rendered.

#### Restrictions

- The decorated class **must** extend `KasstorElement` (not `LitElement` directly).
- The `tag` must be a valid custom element name with a hyphen (e.g. `my-button`). If the tag is already defined by another class, the decorator will not redefine it and a console warning is emitted (except under HMR).

#### Example

```scss
// button.scss

:host {
  // Styles
}

button {
  // Styles
}
```

```ts
// button.lit.ts

import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import {
  Event,
  type EventEmitter
} from "@genexus/kasstor-core/decorators/event.js";
import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import styles from "./button.scss?inline";

/**
 * A button with caption, disabled state, and a click event.
 * @access public
 */
@Component({
  tag: "my-button",
  styles,
  shadow: { delegatesFocus: true }
})
export class MyButton extends KasstorElement {
  /** Specifies the caption to show. */
  @property() caption: string = "Click me";

  /** Whether the button is disabled. */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  /** Emitted when the button is clicked. */
  @Event() protected click!: EventEmitter<void>;

  #onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    this.click.emit();
  };

  override render() {
    return html`<button
      ?disabled=${this.disabled}
      type="button"
      @click=${this.disabled ? nothing : this.#onClick}
    >
      ${this.caption}
    </button>`;
  }
}
```

#### Types

```ts
const Component: <
  LibraryPrefix extends `${string}-`,
  Metadata,
  T extends typeof KasstorElement<Metadata>
>(
  options: ComponentOptions<LibraryPrefix, Metadata>
) => (target: T) => T | void;

/**
 * Options for the Component decorator
 */
export type ComponentOptions<LibraryPrefix extends `${string}-`, Metadata> = {
  globalStyles?: string;

  metadata?: Metadata;

  tag: `${LibraryPrefix}${string}`;

  /**
   * Specifies a set of options to customize the shadow root of the custom
   * element.
   *
   * By default, it assumes that the component uses Shadow DOM, so you only
   * need to provide the options for customizing the shadow root behavior.
   * If not specified, the following set of options are assumed:
   *   - `delegatesFocus: false`
   *   - `formAssociated: false`
   *   - `mode: "open"`
   *
   * If you don't want to use Shadow DOM, you can set this property to `false`.
   * We don't recommend using shadow: false, because slots (composition in
   * general) only exists when using shadow DOM, as well as style a JavaScript
   * encapsulation.
   */
  shadow?: ComponentShadowRootOptions | false;

  styles?: string;
};

export type ComponentShadowRootOptions = {
  /**
   * If `true`, when a non-focusable part of the shadow DOM is clicked, or
   * `.focus()` is called on the host element, the first focusable part inside
   * the host's shadow DOM is given focus, and the shadow host is given any
   * available `:focus` styling.
   *
   * If not specified, it uses `false` by default.
   */
  delegatesFocus?: boolean;

  /**
   * If `true`, it makes the [autonomous custom element](https://html.spec.whatwg.org/dev/custom-elements.html#autonomous-custom-element)
   * a [form-associated custom element](https://html.spec.whatwg.org/dev/custom-elements.html#form-associated-custom-element),
   * which is necessary when implementing custom elements that uses
   * [ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
   * to work on forms.
   *
   * If not specified, it uses `false` by default.
   */
  formAssociated?: boolean;

  /**
   * This defines whether or not the shadow root's internal features are
   * accessible from JavaScript.
   *
   * If not specified, it uses `"open"` by default.
   */
  mode?: ShadowRootMode;
};
```

#### `Event`

The `@Event` decorator provides an easier way to define and dispatch custom DOM events with type safety and proper event configuration.

#### Features

- Type-safe event emitting with generic types
- Support for custom event details
- Configurable event options (bubbles, cancelable, composed)
- Automatic event emitter instance creation
- Returns event object with `defaultPrevented` info

#### Restrictions

- `@Event()` can only be applied to **properties**, not methods. Applying it to a method will throw in development mode.

#### API

- `Event(defaultOptions?: EventInit)` — Optional default options (e.g. `bubbles`, `cancelable`, `composed`) for every emit. Can be overridden per call via `emit(detail, options)`.
- `EventEmitter<T>.emit(detail?: T, options?: EventInit)` — Dispatches a `CustomEvent` with `detail` and returns the event (e.g. to check `defaultPrevented`). Defaults: `bubbles: true`, `cancelable: true`.

#### Example

```ts
// input.lit.ts

import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import {
  Event,
  type EventEmitter
} from "@genexus/kasstor-core/decorators/event.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";

/**
 * Text input that emits the new value on change.
 * @access public
 */
@Component({ tag: "my-input" })
export class MyInput extends KasstorElement {
  /** Current value of the input. */
  @property() value: string = "";

  /** Emitted when the input value changes; detail is the new string. */
  @Event() protected input!: EventEmitter<string>;

  #onInput = (event: InputEvent): void => {
    event.stopPropagation();
    const oldValue = this.value;
    this.value = (event.target as HTMLInputElement).value;

    const eventInfo = this.input.emit(this.value);

    if (eventInfo.defaultPrevented) {
      event.preventDefault();
      this.value = oldValue;
    }
  };

  override render() {
    return html`
      <input
        type="text"
        placeholder="Insert value here..."
        .value=${this.value}
        @input=${this.#onInput}
      />
    `;
  }
}
```

#### `Observe`

The `@Observe` decorator executes a callback when observed properties change, e.g. `@property` or `@state`. This is useful for side effects and property validation.

#### Features

- All callbacks for each `Observe` in a component are called in sync before the `willUpdate` lifecycle method of the component, and even before the `firstWillUpdate`. So, they are not called when a value for a property/state changes.

- On the initial load, the `Observe` callback is called if the default value or the initial value of the component is not `undefined`. So, if you set `undefined` as the default value of the property/state or the host (that uses the component) sets `undefined` as initial value, the `Observe` callback won't be called.

- Works with Server-Side Rendering (SSR).

- Can observe single or multiple properties.

- Changing a property/state inside of a `Observe` callback doesn't trigger an extra update.

- Provides new and old values to callback.

#### Restrictions

- `@Observe` must be applied to a **method** (the callback). Applying it to a non-function will throw in development mode.
- The observed names must be **properties that exist on the class** and should be reactive (`@property` or `@state`). Observing a non-existent property will throw in development mode.

#### API

- `Observe(propertyOrProperties: string | string[])` — One property name or an array of property names. The decorated method is called with `(newValue?, oldValue?)` when any of them change.

#### Example

```ts
// observe-example.lit.ts

import {
  Component,
  KasstorElement,
  Observe
} from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { property, state } from "lit/decorators.js";

/**
 * Example component demonstrating @Observe on single and multiple properties.
 * @access public
 */
@Component({ tag: "my-observe-example" })
export class MyObserveExample extends KasstorElement {
  @state() private propBoolean: boolean = false;

  /** String property observed by propStringChanged. */
  @property() propString: string | undefined;

  /** Number property observed by propBooleanOrNumberChanged. */
  @property({ type: Number }) propNumber: number | undefined;

  @Observe("propString")
  protected propStringChanged(newValue?: unknown, oldValue?: unknown) {
    ...
  }

  @Observe(["propBoolean", "propNumber", ...])
  protected propBooleanOrNumberChanged(newValue?: unknown, oldValue?: unknown) {
   ...
  }
}
```

### Directives

Directives are functions you use inside Lit templates to control how or when content is rendered. Kasstor provides a small set of directives that integrate with its component model and with SSR: they are designed to work with `KasstorElement` and to play well with server-side rendering and hydration. Each directive is imported from its own path under `@genexus/kasstor-core/directives/`.

#### `lazyLoad`

The `lazyLoad` directive automatically loads a component when it is attached to the DOM. It helps improve initial load time by loading components on demand.

#### Features

- Loads the component when the element is attached to the DOM; if the component is already registered, it is used immediately.
- Can only be used in an **ElementPart**: it must be placed on the custom element tag (e.g. `<my-component ${lazyLoad()}></my-component>`).
- Only works with components that extend `KasstorElement` (relies on Kasstor's registration/bootstrapping).

#### Example

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { lazyLoad } from "@genexus/kasstor-core/directives/lazy-load.js";
import { html } from "lit";

/**
 * Root app component that lazy-loads the dashboard.
 * @access public
 */
@Component({ tag: "my-app" })
export class MyApp extends KasstorElement {
  override render() {
    return html`
      <my-header></my-header>
      <my-dashboard ${lazyLoad()}></my-dashboard>
      <my-footer></my-footer>
    `;
  }
}
```

#### Usage

- **Syntax:** `lazyLoad()` with no arguments, on the element's attribute position.
- **Restriction:** Using it in any other part type (e.g. `${lazyLoad()}` inside node content) will throw at runtime, indicating it can only be used in an ElementPart.

#### `renderByPlatform`

The `renderByPlatform` directive renders content based on the current platform (browser or server).

#### Features

- Server: renders `serverValue`; browser: renders `browserValue`. If `serverValue` is omitted, the server renders nothing for that expression (useful for browser-only content).
- During hydration, keeps the server value until the first update, then switches to the browser value (avoids mismatch).
- Only works when the template is rendered by a `KasstorElement` (needs host for hydration).

#### Example

```ts
import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { renderByPlatform } from "@genexus/kasstor-core/directives/render-by-platform.js";
import { html } from "lit";

/**
 * Renders different content on server vs browser using renderByPlatform.
 * @access public
 */
@Component({ tag: "my-render-by-platform-example" })
export class MyRenderByPlatformExample extends KasstorElement {
  override render() {
    return html`
      <h1>${renderByPlatform("Browser only", "Server only")}</h1>
      <p>${renderByPlatform("Client-only text")}</p>
    `;
  }
}
```

In the second line, only the browser will render "Client-only text"; the server renders nothing there. Use this for client-only UI or when the content depends on `window` or other browser APIs.

#### Restrictions

- Must be used in a template rendered by a `KasstorElement` (the directive needs the host for hydration). Using it in a standalone template may break hydration.

#### Signature

- `renderByPlatform(browserValue, serverValue?)`: `browserValue` is shown on the client; `serverValue` on the server. If `serverValue` is omitted, the server renders nothing there (browser-only content).

## Best Practices

### Property Configuration

Use typed properties with explicit configuration for better type safety:

```ts
@property() title: string = '';

@property({ type: Number }) count: number = 0;

@property({ type: Boolean, reflect: true }) disabled: boolean = false;
```

### Do's and Don'ts

**Do**

- Extend `KasstorElement` (not `LitElement`) when using `@Component`; use a unique `tag` per component.

- Use `@Event()` on a property typed as `EventEmitter<Detail>`; call `this.myEvent.emit(detail)` and check `defaultPrevented` when the event is cancelable.

- Use `@Observe` on a method; pass only names of existing `@property` or `@state` fields. Prefer one responsibility per callback.

- Use `lazyLoad()` only on the element tag (e.g. `<my-panel ${lazyLoad()}></my-panel>`). Ensure the component is registered in a Kasstor library.

- Use `renderByPlatform(browserValue, serverValue)` when content must differ by environment (or when you want browser-only content; see Pro tip below).

**Don't**

- Apply `@Event()` to a method or `@Observe` to a non-method.

- Use `shadow: false` unless you have a strong reason (you lose slots and style encapsulation).

- Use `lazyLoad()` in attribute or child positions; it only works on the element tag.

### Pro tip: browser-only content with `renderByPlatform`

If you want to render something **only in the browser** (e.g. client-only UI, feature that depends on `window`), call `renderByPlatform(browserValue)` with a single argument. The server will render nothing for that expression, and after hydration the browser will show `browserValue`. If you want the **same** content on server and client, don't use the directive—render the value directly.

## Contributing

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more information.
