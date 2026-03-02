# Migrating from StencilJS to Kasstor

This guide walks you through migrating a StencilJS project to **Kasstor**, a Lit-based ecosystem for building web components. Kasstor preserves many of the DX patterns you know from Stencil (decorators, typed events, reactive watchers) while leveraging Lit's efficient rendering engine and the modern Vite toolchain.

## What changes and what stays the same

**Stays the same:** You still write web components with decorators, typed events, reactive properties, Shadow DOM, slots, and CSS encapsulation.

**Changes:** The rendering engine switches from Stencil's virtual DOM (JSX) to Lit's tagged template literals (`html`). The build tool moves from the Stencil compiler to Vite. Testing moves from Jest + Puppeteer to Vitest + Playwright. Some decorators are renamed or replaced by Lit equivalents.

## Table of Contents

1. [Project Setup](./01-project-setup.md) — Dependencies, ESLint, TypeScript, Vite config, testing setup
2. [Component Basics](./02-component-basics.md) — File extensions, `@Component`, styles, base class, `@Element` removal
3. [Decorators](./03-decorators.md) — `@Prop`, `@State`, `@Event`, `@Watch` → `@Observe`, `@Method`, `@Listen`, `ElementInternals`
4. [Lifecycle](./04-lifecycle.md) — Lifecycle mapping, `firstWillUpdate`, `scheduleUpdate`, calling `super`
5. [Templates](./05-templates.md) — JSX → `html`, bindings, `<Host>`, `forceUpdate`, conditionals, loops
6. [Signals and Store](./06-signals-store.md) — `@stencil/store` → `@genexus/kasstor-signals`
7. [Testing](./07-testing.md) — Jest/Puppeteer → Vitest/Playwright
8. [Full Example](./08-full-example.md) — Complete before/after component using all features

## Quick-Reference Table

| StencilJS | Kasstor / Lit | Notes |
| --- | --- | --- |
| `@Component({ tag, styleUrl })` | `@Component({ tag, styles })` | Styles imported with `?inline`; class extends `KasstorElement` |
| `@Element() el` | `this` | `this` IS the host element in Lit/Kasstor |
| `@Prop()` | `@property()` (from Lit) | Add `type: Number`/`Boolean` or `attribute: false` for non-strings |
| `@Prop({ reflect: true })` | `@property({ reflect: true })` | Same concept |
| `@Prop({ mutable: true })` | `@property()` | All Lit properties are mutable internally |
| `@State()` | `@state()` (from Lit) | Add `private` or `protected` keyword |
| `@Event() + EventEmitter<T>` | `@Event() + EventEmitter<T>` | Import from `@genexus/kasstor-core/decorators/event.js`; add `!` for strict TS |
| `@Watch("prop")` | `@Observe("prop")` | Key difference: `@Observe` also fires before the first render |
| `@Method()` | Plain class method | Not async by default (unlike Stencil) |
| `@Listen("event")` | `addEventListener` in `connectedCallback` | Manual cleanup in `disconnectedCallback` |
| `@AttachInternals` | `this.attachInternals()` | Set `shadow: { formAssociated: true }` in `@Component` |
| `componentWillLoad()` | `firstWillUpdate()` | Runs once before first render; SSR-safe |
| `componentDidLoad()` | `firstUpdated()` | Runs once after first render |
| `componentWillRender()` | `willUpdate()` | Runs before every render |
| `componentDidRender()` | `updated()` | Runs after every render |
| `render() { return <JSX> }` | `override render() { return html\`...\` }` | Tagged template literals instead of JSX |
| `<Host class={{ active }}>` | `connectedCallback` + `@Observe` | No `Host` equivalent; set host attrs imperatively |
| `forceUpdate(this)` | `this.requestUpdate()` | Enqueues a re-render |
| `@stencil/store` | `@genexus/kasstor-signals` | Reactive signals with `signal()`, `computed()`, `effect()` |
| `.tsx` extension | `.lit.ts` extension | Required for HMR and build analysis |
| Jest + Puppeteer | Vitest + Playwright | `await el.updateComplete` instead of `page.waitForChanges()` |

## Best Practices

- **Event handler binding:** Use arrow functions or private class fields (`#handler = () => { ... }`) for event handlers so that `this` is correctly bound. Regular methods lose their `this` context when passed as callbacks.
- **Always call `super` in lifecycle hooks:** When overriding `connectedCallback()`, call `super.connectedCallback()` first. When overriding `disconnectedCallback()`, call `super.disconnectedCallback()` last.
