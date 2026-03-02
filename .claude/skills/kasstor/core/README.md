# @genexus/kasstor-core

A set of decorators and directives to enhance Lit components with powerful features for building web component libraries and applications.

## API Reference

Consult this table to choose which document to load. Details and examples are in the linked sub-readmes.

### Decorators ([decorators.md](decorators.md))

| API | Description |
|-----|-------------|
| [Component](decorators.md#component) | Defines a Kasstor custom element. Auto-registers; Shadow Root config (mode, formAssociated, delegatesFocus); SSR, SCSS, no-Shadow; firstWillUpdate; HMR; improved TBT. Must extend KasstorElement; tag must have hyphen. |
| [Event](decorators.md#event) | Type-safe custom events. `Event(defaultOptions?)`; `EventEmitter<T>.emit(detail?, options?)`. Applied to properties only. Returns event with `defaultPrevented`. |
| [Observe](decorators.md#observe) | Runs callback when `@property`/`@state` change. `Observe(propertyOrProperties: string | string[])`. Applied to methods only. SSR-safe; provides new/old values. |

### Bootstrapping ([bootstrapping.md](bootstrapping.md))

| API | Description |
|-----|-------------|
| [registerCustomElementLoaders](bootstrapping.md#registercustomelementloaders) | Registers loaders for declarative lazy loading. Call once at startup with `customElements` map (tag → loader + optional dependencies). Required for `lazyLoad`. |

### Directives ([directives.md](directives.md))

| API | Description |
|-----|-------------|
| [lazyLoad](directives.md#lazyload) | Loads component when element is attached. Use on element tag only (e.g. `<my-panel ${lazyLoad()}></my-panel>`). Requires `registerCustomElementLoaders`. |
| [renderByPlatform](directives.md#renderbyplatform) | Different content server vs browser. `renderByPlatform(browserValue, serverValue?)`. Single arg = browser-only. Needs KasstorElement host for hydration. |

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
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "dist/",
    "rootDir": "./src",
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
