# @genexus/kasstor-core

A set of decorators and directives to enhance Lit components with powerful features for building web component libraries and applications.

## Table of Contents

- [Installation](#installation)
- [TypeScript configuration](#typescript-configuration)
- [API](#api)
  - [Decorators](#decorators)
    - [`Component`](#component)
    - [`Event`](#event)
    - [`Observe`](#observe)
  - [Bootstrapping](#bootstrapping)
    - [`registerCustomElementLoaders`](#registercustomelementloaders)
    - [`CustomElementInfo`](#customelementinfotagname)
  - [Directives](#directives)
    - [`lazyLoad`](#lazyload)
    - [`renderByPlatform`](#renderbyplatform)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Installation

```bash
npm i @genexus/kasstor-core
```

## TypeScript configuration

Kasstor uses **TypeScript decorators** (the legacy/experimental kind), not the current ECMAScript standard decorators. Your `tsconfig.json` must enable them and use the right class field semantics so that `@Component`, `@Event`, `@Observe`, and `@property` work correctly.

**Required:**

- **`experimentalDecorators: true`** — enables TypeScript decorators.
- **`useDefineForClassFields: false`** — keeps the class field semantics that Lit and Kasstor decorators expect (property descriptors on the prototype). With `true`, TypeScript uses standard field semantics and decorators can break.

A working baseline (adjust paths and options to your project):

```json
{
  "compilerOptions": {
    "target": "es2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "es2022",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "dist/",

    // Necessary to not add the src folder inside the dist
    "rootDir": "./src",

    // Linting
    "allowUnreachableCode": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "vite.config.ts", "**/*.e2e.ts"]
}
```

If you use a different build tool or emit TypeScript yourself, keep at least `experimentalDecorators: true` and `useDefineForClassFields: false`.

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

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";
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

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { Event, type EventEmitter } from "@genexus/kasstor-core/decorators/event.js";
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

### Bootstrapping

Bootstrapping APIs let library authors register custom element **loaders** so that components can be loaded on demand (e.g. when they appear in a template) instead of only via direct import.

#### `registerCustomElementLoaders`

Registers a set of custom element loaders for a library. Each loader is a function that returns a Promise (typically a dynamic `import()` of the component class). When a tag is used in the DOM (e.g. via the **`lazyLoad`** directive), the corresponding loader is run and the element is defined. This enables declarative lazy loading: components are loaded only when they are attached, improving initial load time.

**Use case:** You are building a component library (or an app) and want to support lazy loading. Call `registerCustomElementLoaders` once at startup with a map of tag names to **`CustomElementInfo`** (loader + optional `dependencies`); then any template can use `<my-panel ${lazyLoad()}></my-panel>` and the panel will be loaded when it is rendered.

##### How it works

- **Single global registry:** The first call initializes a global registry (and a mutation observer). Later calls add or skip loaders based on prefix and tag.
- **Library prefix:** All tag names in `customElements` must start with `libraryPrefix` (e.g. `my-`). The prefix identifies the library and avoids collisions; if the prefix is already registered by another library, the whole call is skipped and a warning is logged.
- **Per-tag registration:** For each tag in `customElements`, if that tag is not yet registered, the loader and `dependencies` (or the default) are stored. If the tag was already registered by another library, it is skipped and a warning is logged.
- **Default for `dependencies`:** If an entry omits `dependencies`, `defaultCustomElementWatchingBehavior` is used (either `"never-observe"` or `"always-observe"`).
- **Already-attached elements:** If elements with one of the new tags are already in the DOM (e.g. rendered before this call), their loaders are run so those elements get defined.
- **When `lazyLoad` runs:** When an element with a registered tag is attached (e.g. Lit renders `<my-panel ${lazyLoad()}></my-panel>`), the runtime looks up the loader for that tag, runs it once, waits for the Promise, defines the custom element, and the component then renders. If the element was already defined (e.g. by a direct import), the loader is not run.

##### Options (`LibraryLoaderOptions<Prefix>`)

- **`libraryName`** — Human-readable name for the library (used in warnings).
- **`libraryPrefix`** — Prefix shared by all tags (e.g. `"my-"`). Type: `LibraryPrefix` (string ending with `-`).
- **`defaultCustomElementWatchingBehavior`** — Default for entries that do not set `dependencies`: `"never-observe"` or `"always-observe"`.
- **`customElements`** — Record of tag name → **`CustomElementInfo`** (see below). Tag names must extend the prefix (e.g. `"my-panel"`, `"my-dashboard"`).

##### `CustomElementInfo<TagName>`

Each entry in `customElements` must conform to this type:

```ts
export type CustomElementExplicitDependencies<ElementItself = string> = Exclude<
  CustomElementTagNames | (string & {}),
  // Exclude the tag itself, as it is not a dependency
  ElementItself
>[];

export type CustomElementDependencies<ElementItself = string> =
  | CustomElementExplicitDependencies<ElementItself>
  | "never-observe"
  | "always-observe";

/**
 * Describes how to load a single custom element and how to observe its
 * Shadow DOM for nested custom elements. Used as the value type for each
 * entry in `LibraryLoaderOptions.customElements`.
 *
 * - **loader** — Required. Invoked when the element is first needed (e.g. by
 *   `lazyLoad`); must return a Promise that resolves when the component is
 *   defined. Typically `() => import("./my-panel.js")`. Cached per tag.
 * - **dependencies** — Optional. Controls Shadow DOM observation for nested
 *   tags: `"never-observe"` (default for many), `"always-observe"`, or an
 *   array of tag names. Omitted entries use the library's
 *   `defaultCustomElementWatchingBehavior`.
 */
export type CustomElementInfo<TagName extends string> = {
  /** Returns a Promise that resolves when the custom element is defined. */
  loader: () => Promise<unknown>;

  /**
   * Include the dependencies of your library's custom element tag.
   *
   * This property is important to **optimize** the render performance of
   * your library, by avoid observing mutations in custom elements that
   * don't use any other custom element, or where its dependencies are
   * already defined.
   *
   *  - `"never-observe"`: It means that the custom element doesn't have
   *    any dependencies, so it will not be observed for mutations in its
   *    Shadow Root.
   *
   *  - `"always-observe"`: The custom element will **always** be observed
   *    for mutations in its Shadow Root.
   *
   *  - When you specify an array of dependencies (tag names), it means
   *    that the custom element will be observed for mutations in its
   *    shadow root until all its dependencies are defined.
   *
   *    This is least common case, as most custom elements know their
   *    dependencies. This case can happen if you let customize the
   *    internal render of your custom element with a property that
   *    redefines the render. This is the case for the Chameleon's
   *    `ch-chat`, the internal render of messages can be customized with
   *    the `renderItem` function, so we can avoid observing that custom
   *    element.
   *
   *    **IMPORTANT!!**: Try to avoid this case, as it can lead to
   *    performance issues, because the custom element will always be
   *    observed for DOM mutations.
   */
  dependencies?: CustomElementDependencies<TagName>;
};
```

#### Example

```ts
import { registerCustomElementLoaders } from "@genexus/kasstor-core/bootstrapping/register-custom-element-loaders.js";

registerCustomElementLoaders({
  libraryName: "My Library",
  libraryPrefix: "my-",
  defaultCustomElementWatchingBehavior: "never-observe",
  customElements: {
    "my-panel": {
      loader: () => import("./components/my-panel.js")
    },
    "my-dashboard": {
      loader: () => import("./components/my-dashboard.js"),
      dependencies: "always-observe"
    }
  }
});
```

After this, templates can use `<my-panel ${lazyLoad()}></my-panel>` and the panel will be loaded when it is attached to the DOM.

##### Conflicts

- If **`libraryPrefix`** is already in use by another library, the entire call is skipped and a warning is logged.
- If a **tag** is already registered by another library, that tag is skipped and a warning is logged; other tags in the same call are still registered.

### Directives

Directives are functions you use inside Lit templates to control how or when content is rendered. Kasstor provides a small set of directives that integrate with its component model and with SSR: they are designed to work with `KasstorElement` and to play well with server-side rendering and hydration. Each directive is imported from its own path under `@genexus/kasstor-core/directives/`.

#### `lazyLoad`

The `lazyLoad` directive automatically loads a component when it is attached to the DOM. It helps improve initial load time by loading components on demand.

**Requirement:** The component’s tag must be registered via **`registerCustomElementLoaders`** (see [Bootstrapping](#bootstrapping)). The library (or app) calls `registerCustomElementLoaders` at startup with loaders for each tag; `lazyLoad` then uses those loaders when the element is attached.

#### Features

- Loads the component when the element is attached to the DOM; if the component is already registered, it is used immediately.
- Can only be used in an **ElementPart**: it must be placed on the custom element tag (e.g. `<my-component ${lazyLoad()}></my-component>`).
- Only works with components whose tags are registered via `registerCustomElementLoaders` (and that extend `KasstorElement`).

#### Example

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
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
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
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

