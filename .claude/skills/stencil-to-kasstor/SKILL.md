---
name: stencil-to-kasstor
description: Migrate a StencilJS project or component to Kasstor/Lit. Use when the user mentions migrating from Stencil, @stencil/core decorators (@Prop, @State, @Event, @Watch, @Method, @Listen), stencil.config.ts, @stencil/store, Stencil lifecycle hooks, or wants to convert a Stencil .tsx component.
---

# Migrating from StencilJS to Kasstor

This guide walks you through migrating a StencilJS project to **Kasstor**, a Lit-based ecosystem for building web components. Kasstor preserves many of the DX patterns you know from Stencil (decorators, typed events, reactive watchers) while leveraging Lit's efficient rendering engine and the modern Vite toolchain.

## Instructions

- Use **this document** as the entry point: what changes, the quick-reference table, and the sub-doc index below.
- **When you need details for a specific area**, open the corresponding sub-doc from the API Reference table. Do not load all sub-docs at once — choose the one that matches the task.

---

## What Changes and What Stays the Same

**Stays the same:** You still write web components with decorators, typed events, reactive properties, Shadow DOM, slots, and CSS encapsulation.

**Changes:** The rendering engine switches from Stencil's virtual DOM (JSX) to Lit's tagged template literals (`html`). The build tool moves from the Stencil compiler to Vite. Testing moves from Jest + Puppeteer to Vitest + Playwright. Some decorators are renamed or replaced by Lit equivalents.

---

## Quick-Reference Table

| StencilJS                       | Kasstor / Lit                              | Notes                                                                          |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `@Component({ tag, styleUrl })` | `@Component({ tag, styles })`              | Styles imported with `?inline`; class extends `KasstorElement`                 |
| `@Element() el`                 | `this`                                     | `this` IS the host element in Lit/Kasstor                                      |
| `@Prop()`                       | `@property()` (from Lit)                   | Add `type: Number`/`Boolean` or `attribute: false` for non-strings             |
| `@Prop({ reflect: true })`      | `@property({ reflect: true })`             | Same concept                                                                   |
| `@Prop({ mutable: true })`      | `@property()`                              | All Lit properties are mutable internally                                      |
| `@State()`                      | `@state()` (from Lit)                      | Add `private` or `protected` keyword                                           |
| `@Event() + EventEmitter<T>`    | `@Event() + EventEmitter<T>`               | Import from `@genexus/kasstor-core/decorators/event.js`; add `!` for strict TS |
| `@Watch("prop")`                | `@Observe("prop")`                         | Key difference: `@Observe` also fires before the first render                  |
| `@Method()`                     | Plain class method                         | Not async by default (unlike Stencil)                                          |
| `@Listen("event")`              | `addEventListener` in `connectedCallback`  | Manual cleanup in `disconnectedCallback`                                       |
| `@AttachInternals`              | `this.attachInternals()`                   | Set `shadow: { formAssociated: true }` in `@Component`                         |
| `componentWillLoad()`           | `firstWillUpdate()`                        | Runs once before first render; SSR-safe                                        |
| `componentDidLoad()`            | `firstUpdated()`                           | Runs once after first render                                                   |
| `componentWillRender()`         | `willUpdate()`                             | Runs before every render                                                       |
| `componentDidRender()`          | `updated()`                                | Runs after every render                                                        |
| `render() { return <JSX> }`     | `override render() { return html\`...\` }` | Tagged template literals instead of JSX                                        |
| `<Host class={{ active }}>`     | `connectedCallback` + `@Observe`           | No `Host` equivalent; set host attrs imperatively                              |
| `forceUpdate(this)`             | `this.requestUpdate()`                     | Enqueues a re-render                                                           |
| `@stencil/store`                | `@genexus/kasstor-signals`                 | Reactive signals with `signal()`, `computed()`, `effect()`                     |
| `.tsx` extension                | `.lit.ts` extension                        | Required for HMR and build analysis                                            |
| Jest + Puppeteer                | Vitest + Playwright                        | `await el.updateComplete` instead of `page.waitForChanges()`                   |

---

## Best Practices

- **Event handler binding:** Use private class fields (`#handler = () => { ... }`) for event handlers so that `this` is correctly bound. Regular methods lose their `this` context when passed as callbacks.
- **Always call `super` in lifecycle hooks:** When overriding `connectedCallback()`, call `super.connectedCallback()` first. When overriding `disconnectedCallback()`, call `super.disconnectedCallback()`.
- **DOM refs:** Always use `createRef` + `ref` directive. Never use `@query`.
- **Member ordering:** `@state` before `@property` (both alphabetical), each `@Observe` inline after its property, `@Event` after properties, public methods after events, lifecycle in execution order, `render()` always last.
- **JSDoc:** All `@property`, `@state`, `@Event`, and public methods must have JSDoc. Document CSS parts with `@part name - description` and slots with `@slot name - description` on the class JSDoc.

---

## API Reference

Load the sub-doc that matches the area you are working on.

| Sub-doc                                               | When to load                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [project-setup.md](references/project-setup.md)       | Removing Stencil deps, installing Kasstor, tsconfig, vite.config.ts, bundles migration, testing setup       |
| [component-basics.md](references/component-basics.md) | File extension (.tsx → .lit.ts), base class, @Component options table, styles, @Element removal             |
| [decorators.md](references/decorators.md)             | @Prop → @property, @State, @Event, @Watch → @Observe, @Method, @Listen, ElementInternals                    |
| [lifecycle.md](references/lifecycle.md)               | Lifecycle mapping table, firstWillUpdate, scheduleUpdate, when to call super                                |
| [templates.md](references/templates.md)               | JSX → html, self-closing tags, binding types, conditionals, loops, slots, refs, Host migration, forceUpdate |
| [signals.md](references/signals.md)                   | @stencil/store → @genexus/kasstor-signals, signal/computed/effect/watch directive, @SignalProp              |
| [testing.md](references/testing.md)                   | Jest/Puppeteer → Vitest/Playwright, vitest.config.ts, API changes table, migration examples                 |
| [full-example.md](references/full-example.md)         | Complete before/after component using all features + summary table of all 25 changes                        |

