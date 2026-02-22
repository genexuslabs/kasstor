# @genexus/kasstor-webkit

Utilities for web applications: array helpers, internationalization (i18n), type-ahead search, frame synchronization, and shared local storage keys.

## Table of Contents

- [Installation](#installation)

- [Array utilities](#array-utilities)
  - [`insertIntoIndex`](#insertintoindex)
  - [`removeIndex`](#removeindex)

- [Internationalization (i18n)](#internationalization-i18n)
  - [Feature ID: what is a "feature"?](#feature-id-what-is-a-feature)
  - [Quick start](#quick-start)
  - [Locale files and loader shape](#locale-files-and-loader-shape)
  - [Multiple features and register-once](#multiple-features-and-register-once)
  - [Getting current language and translations](#getting-current-language-and-translations)
  - [Changing language and subscribing](#changing-language-and-subscribing)
  - [Using i18n with Lit](#using-i18n-with-lit)

- [TypeAhead](#typeahead)
  - [Usage](#usage)

- [Frame synchronization](#frame-synchronization)
  - [API](#api)

- [Local storage keys](#local-storage-keys)

- [Best practices](#best-practices)
  - [i18n](#i18n)
  - [TypeAhead](#typeahead-1)
  - [SyncWithRAF](#syncwithraf)

- [API Reference](#api-reference)
  - [Array](#array-genexuskasstor-webkitarrayjs)
  - [Internationalization](#internationalization-genexuskasstor-webkitinternationalizationjs)
  - [TypeAhead](#typeahead-genexuskasstor-webkittype-aheadjs)
  - [Frame synchronization](#frame-synchronization-genexuskasstor-webkitsync-with-framesjs)
  - [Local storage keys](#local-storage-keys-genexuskasstor-webkitshared-local-storage-keysjs)

- [Contributing](#contributing)

## Installation

```bash
npm i @genexus/kasstor-webkit
```

## Array utilities

Helpers for in-place array insertion and removal. Import from
`@genexus/kasstor-webkit/array.js`.

### `insertIntoIndex`

Inserts a single element at a given index. Mutates the array.

- **Behavior:** Uses `splice`; elements at and after the index shift right. Does not return a value.

**Example**

```ts
import { insertIntoIndex } from "@genexus/kasstor-webkit/array.js";

const items = ["apple", "cherry", "date"];
insertIntoIndex(items, "banana", 1);
console.log(items); // ['apple', 'banana', 'cherry', 'date']
```

### `removeIndex`

Removes the element at a single index and returns it. Mutates the array.

- **Behavior:** Uses `splice`; subsequent elements shift left. Returns the removed element (or `undefined` if index out of range).

**Example**

```ts
import { removeIndex } from "@genexus/kasstor-webkit/array.js";

const items = ["apple", "banana", "cherry", "date"];
const removed = removeIndex(items, 1);
console.log(removed); // 'banana'
console.log(items); // ['apple', 'cherry', 'date']
```

## Internationalization (i18n)

Multi-language support with async translation loaders, language detection, URL/path handling, and subscription to language changes. Import from
`@genexus/kasstor-webkit/internationalization.js`.

### Feature ID: what is a “feature”?

A **feature** is the scope of a set of translations. The term is intentionally broad: a feature can be the whole application, a module, or **a single component**. You can register one feature for shared/app-wide strings, another per area (e.g. “trial”, “common”), or one per component. Each component (or base class) then uses the same `featureId` in `getCurrentTranslations` and `subscribeToLanguageChanges`. The same ID is used when calling `registerTranslations` for that feature.

### Quick start

**Minimal example**

Suggested layout (paths relative to your app or feature):

```
src/
├── common/
│   └── feature-ids.ts
├── managers/
│   └── internationalization/
│       ├── locales/
│       │   ├── en.ts
│       │   └── es.ts
│       ├── translations-scheme.ts
│       └── register-translations.ts
└── main.ts          (or router / bootstrap entry)
```

`common/feature-ids.ts` — feature ID constant:

```ts
export const APP_MAIN_FEATURE_ID = "app-main";
```

`managers/internationalization/translations-scheme.ts` — translation schema (type the loader and locale files with this):

```ts
export type AppTranslationsSchema = {
  greeting: string;
  farewell: string;
};
```

`managers/internationalization/register-translations.ts` — loader and registration (typed so keys and return shape are checked):

```ts
import type { KasstorLanguage } from "@genexus/kasstor-webkit";
import { registerTranslations } from "@genexus/kasstor-webkit/internationalization.js";
import { APP_MAIN_FEATURE_ID } from "../../common/feature-ids";
import type { AppTranslationsSchema } from "./translations-scheme";

const loader: Record<KasstorLanguage, () => Promise<AppTranslationsSchema>> = {
  english: () => import("./locales/en").then(m => m.default),
  spanish: () => import("./locales/es").then(m => m.default)
};

export const registerAppTranslations = (): void =>
  registerTranslations(APP_MAIN_FEATURE_ID, loader);
```

Bootstrap (e.g. `main.ts` or router). Pass your app's or framework's navigate function so the URL updates when the language changes. Omit `pathname` when not using server-side rendering.

```ts
import { setInitialApplicationLanguage } from "@genexus/kasstor-webkit/internationalization.js";
import { registerAppTranslations } from "./managers/internationalization/register-translations";

registerAppTranslations();

setInitialApplicationLanguage({
  // Your framework or app's function to navigate to a path (e.g. React Router
  // navigate, Angular router, Vue Router). Called with the new pathname when
  // the language changes.
  locationChangeCallback: frameworkNavigateFunction
  // pathname: only pass when using server-side rendering; in the browser
  // without SSR, the current window location is used automatically.
});
```

**What each part does**

1. **Locale files** — One file per language (e.g. `managers/internationalization/locales/en.ts`, `locales/es.ts`), each exporting the translation object (default export or named `language`). Use a shared type in `translations-scheme.ts` so all locales satisfy the same schema.

2. **Feature ID constant** — Define a constant per feature and use it everywhere (registration, components, base class).

3. **Loader with dynamic imports** — Build an object that maps each `KasstorLanguage` to a function that returns `import("./locales/xx").then(m => m.default)` (or `m.language`). Use **dynamic `import()`** only; see [Best practices > i18n](#i18n).

4. **Register once** — Call `registerTranslations(featureId, loader)` once per feature: at app bootstrap or when a module loads. Optionally guard so registration runs only once (e.g. for libraries or HMR).

5. **Bootstrap** — Call `setInitialApplicationLanguage({ locationChangeCallback, pathname? })` once at app startup. `locationChangeCallback` should call your app's or framework's navigation (e.g. React Router's `navigate`, Angular router, or `history.replaceState`) so the URL reflects the new language. Pass `pathname` only when using server-side rendering; in the browser without SSR, the current window location is used and `pathname` can be omitted.

6. **In components** — Use `getCurrentTranslations(featureId)` for the initial value. In `connectedCallback`, call `subscribeToLanguageChanges(featureId, newTranslations => { this.translations = newTranslations })` and store the returned ID; in `disconnectedCallback`, call `unsubscribeToLanguageChanges(id)`.

### Locale files and loader shape

- **One file per language** — e.g. `managers/internationalization/locales/en.ts`, `locales/es.ts`, `locales/ar.ts`. Each file exports a single object (default export or named like `language`) that matches your translation schema.

- **Typed schema** — Define a TypeScript type (or interface) for that object and use `satisfies MySchema` in each locale file so keys stay consistent. Use the same type in `getCurrentTranslations<MySchema>(featureId)` and in the subscribe callback.

- **Loader** — An object with a key for every supported language (`KasstorLanguage`). Each value is a function that returns a Promise of the translation object. Use **dynamic `import()`** so the bundler code-splits; each locale is loaded only when that language is selected.

### Multiple features and register-once

- **Multiple features** — You can split translations into several features (e.g. app-wide strings, a "trial" flow, shared UI). Each feature has its own ID and loader.

- **Register once** — Call `registerTranslations(featureId, loader)` once per feature at app startup. Do not call it inside render or on every request.

- **Guard** — If the same module can run more than once (e.g. HMR or a library used by a host app), use a simple guard so registration runs only once.

**Example: two features (app-main and trial)**

Define the feature IDs:

```ts
// common/feature-ids.ts
export const APP_MAIN_FEATURE_ID = "app-main";
export const TRIAL_FEATURE_ID = "trial";
```

Schema and locales for **app-main** (welcome, footer):

```ts
// managers/internationalization/schemas/app-main-schema.ts
export type AppMainTranslationsSchema = {
  welcome: string;
  footer: string;
};
```

```ts
// managers/internationalization/locales/app-main/en.ts
import type { AppMainTranslationsSchema } from "../schemas/app-main-schema";

export default {
  welcome: "Welcome",
  footer: "© My App"
} satisfies AppMainTranslationsSchema;
```

```ts
// managers/internationalization/locales/app-main/es.ts
import type { AppMainTranslationsSchema } from "../schemas/app-main-schema";

export default {
  welcome: "Bienvenido",
  footer: "© Mi App"
} satisfies AppMainTranslationsSchema;
```

Schema and locales for **trial** (pricing, limits):

```ts
// managers/internationalization/schemas/trial-schema.ts
export type TrialTranslationsSchema = {
  pricing: string;
  limits: string;
};
```

```ts
// managers/internationalization/locales/trial/en.ts
import type { TrialTranslationsSchema } from "../schemas/trial-schema";

export default {
  pricing: "Pricing",
  limits: "Limits"
} satisfies TrialTranslationsSchema;
```

```ts
// managers/internationalization/locales/trial/es.ts
import type { TrialTranslationsSchema } from "../schemas/trial-schema";

export default {
  pricing: "Precios",
  limits: "Límites"
} satisfies TrialTranslationsSchema;
```

Loaders and registration:

```ts
// managers/internationalization/register-translations.ts
import type { KasstorLanguage } from "@genexus/kasstor-webkit";
import { registerTranslations } from "@genexus/kasstor-webkit/internationalization.js";
import { APP_MAIN_FEATURE_ID, TRIAL_FEATURE_ID } from "../../common/feature-ids";
import type { AppMainTranslationsSchema } from "./schemas/app-main-schema";
import type { TrialTranslationsSchema } from "./schemas/trial-schema";

const appMainLoader: Record<KasstorLanguage, () => Promise<AppMainTranslationsSchema>> = {
  english: () => import("./locales/app-main/en").then(m => m.default),
  spanish: () => import("./locales/app-main/es").then(m => m.default)
};

const trialLoader: Record<KasstorLanguage, () => Promise<TrialTranslationsSchema>> = {
  english: () => import("./locales/trial/en").then(m => m.default),
  spanish: () => import("./locales/trial/es").then(m => m.default)
};

export function registerAllTranslations(): void {
  registerTranslations(APP_MAIN_FEATURE_ID, appMainLoader);
  registerTranslations(TRIAL_FEATURE_ID, trialLoader);
}
```

Bootstrap: call once in `main.ts` (or your app entry):

```ts
import { registerAllTranslations } from "./managers/internationalization/register-translations";

registerAllTranslations();
```

In components, use the same feature ID: `getCurrentTranslations(APP_MAIN_FEATURE_ID)` or `getCurrentTranslations(TRIAL_FEATURE_ID)`.

### Getting current language and translations

- **`getCurrentLanguage()`** — Returns `{ fullLanguageName, subtag }` or `undefined` if no language is set.

- **`getCurrentTranslations(featureId)`** — Returns the translation object for the current language and feature, or `undefined` if not loaded. Use the same feature ID constant as in registration and subscription.

**Example**

```ts
import {
  getCurrentLanguage,
  getCurrentTranslations
} from "@genexus/kasstor-webkit/internationalization.js";
import { APP_MAIN_FEATURE_ID } from "./common/feature-ids";

const currentLanguage = getCurrentLanguage();
console.log(currentLanguage?.subtag); // e.g. 'en'

const currentTranslations = getCurrentTranslations(APP_MAIN_FEATURE_ID);
console.log(currentTranslations?.greeting); // e.g. 'Hello'
```

### Changing language and subscribing

- **`setLanguage(language, executeLocationChange?)`** — Sets the active language, loads translations, updates document and (optionally) URL, then notifies subscribers. Returns the new pathname if the URL was updated.

- **`subscribeToLanguageChanges(featureId, callback)`** — Subscribes to language changes. The callback receives the **new translation object** for that feature; set `this.translations = newTranslations` there. Returns a subscriber ID.

- **`unsubscribeToLanguageChanges(subscriberId)`** — Removes the subscription. Must be called in `disconnectedCallback` to avoid leaks.

For **Lit** components, see [Using i18n with Lit](#using-i18n-with-lit) below.

### Using i18n with Lit

The following examples use `@genexus/kasstor-core` and Lit decorators. **Prefer a base component with automatic translations:** it simplifies every concrete component (subscribe/unsubscribe and `translations` updates are handled once in the base), and translations stay in sync when the language changes.

**Suggested layout** (paths relative to your app; registration and locales as in [Quick start](#quick-start) / [Multiple features](#multiple-features-and-register-once)):

```
src/
├── typings/
│   ├── app-metadata.ts
│   └── translation-schemas.ts
├── app-component.ts
├── header.lit.ts
├── footer.lit.ts
├── managers/
│   └── internationalization/
│       ├── locales/
│       │   ├── header/
│       │   │   ├── en.ts
│       │   │   └── es.ts
│       │   └── footer/
│       │       ├── en.ts
│       │       └── es.ts
│       └── register-translations.ts
└── main.ts
```

**Recommended: base component with automatic translations**

Use a **base class** that reads the feature ID from **component decorator metadata** and manages `translations` and subscribe/unsubscribe. Concrete components only pass `metadata: { featureId: "..." }` in the decorator and implement `render()`. No per-component helper or `getTranslationsFeatureId()` — the feature is declared once in metadata. Register each feature's translations once at app or base-module load.

**1. Metadata and translation schemas**

Define a metadata type whose `featureId` is the same string you use in `registerTranslations`. Define one translation schema type per feature and a conditional type that maps `featureId` to the right schema (so each component gets typed `translations`).

```ts
// typings/app-metadata.ts
export type AppMetadata = {
  featureId: "header" | "footer";
};
```

```ts
// typings/translation-schemas.ts
import type { AppMetadata } from "./app-metadata";

export type HeaderTranslationsSchema = { title: string };
export type FooterTranslationsSchema = { copyright: string };

export type AppTranslationsSchema<T extends AppMetadata["featureId"]> =
  T extends "header" ? HeaderTranslationsSchema : FooterTranslationsSchema;
```

**2. Base class and optional custom decorator**

The base class uses `this.kstMetadata.featureId` for `getCurrentTranslations` and `subscribeToLanguageChanges`. Optionally, a **custom decorator** (e.g. `AppComponent`) wraps `Component` and requires `metadata`, so every component is forced to declare its feature.

```ts
// app-component.ts
import {
  Component,
  KasstorElement,
  type ComponentOptions
} from "@genexus/kasstor-core/decorators/component.js";
import {
  getCurrentTranslations,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "@genexus/kasstor-webkit/internationalization.js";
import { state } from "lit/decorators";
import type { AppMetadata } from "./typings/app-metadata";
import type { AppTranslationsSchema } from "./typings/translation-schemas";

export const AppComponent = <
  Metadata extends AppMetadata,
  T extends typeof AppElement<Metadata>
>(
  options: ComponentOptions<"app-", Metadata> & { metadata: Metadata }
) => Component<"app-", Metadata, T>(options);

export abstract class AppElement<Metadata extends AppMetadata> extends KasstorElement<Metadata> {
  @state() protected translations: AppTranslationsSchema<Metadata["featureId"]> | undefined =
    getCurrentTranslations(this.kstMetadata!.featureId);

  #subscriberId!: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#subscriberId = subscribeToLanguageChanges(
      this.kstMetadata!.featureId,
      newTranslations => {
        this.translations = newTranslations as AppTranslationsSchema<Metadata["featureId"]>;
      }
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unsubscribeToLanguageChanges(this.#subscriberId);
  }
}
```

**3. Concrete components**

Each component defines a metadata constant (with `featureId`) and passes it to the decorator. It extends the base with that metadata type so `this.translations` is typed correctly. Only `render()` is implemented.

```ts
// header.lit.ts
import { html } from "lit";
import { AppComponent, AppElement } from "./app-component";
import type { AppMetadata } from "./typings/app-metadata";

const headerMetadata = { featureId: "header" } as const satisfies {
  featureId: AppMetadata["featureId"];
};

@AppComponent({ tag: "app-header", metadata: headerMetadata })
export class AppHeaderElement extends AppElement<typeof headerMetadata> {
  override render() {
    return html`<h1>${this.translations?.title ?? ""}</h1>`;
  }
}
```

```ts
// footer.lit.ts
import { html } from "lit";
import { AppComponent, AppElement } from "./app-component";
import type { AppMetadata } from "./typings/app-metadata";

const footerMetadata = { featureId: "footer" } as const satisfies {
  featureId: AppMetadata["featureId"];
};

@AppComponent({ tag: "app-footer", metadata: footerMetadata })
export class AppFooterElement extends AppElement<typeof footerMetadata> {
  override render() {
    return html`<footer>${this.translations?.copyright ?? ""}</footer>`;
  }
}
```

If you don't use a custom decorator, use `@Component` from `@genexus/kasstor-core` and pass `metadata: { featureId: "header" }` (or `"footer"`) in the options; the base class and concrete components stay the same.

**Alternative: single component (no base class)**

If you prefer not to use a base class, subscribe in `connectedCallback` and unsubscribe in `disconnectedCallback`; in the callback, set `this.translations = newTranslations`.

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core";
import {
  getCurrentTranslations,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "@genexus/kasstor-webkit/internationalization.js";
import { html } from "lit";
import { state } from "lit/decorators";
import { GREETING_FEATURE_ID } from "../common/feature-ids";

@Component({ tag: "app-greeting" })
export class AppGreeting extends KasstorElement {
  @state() private translations = getCurrentTranslations(GREETING_FEATURE_ID);
  #subscriberId: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#subscriberId = subscribeToLanguageChanges(GREETING_FEATURE_ID, newTranslations => {
      this.translations = newTranslations;
    });
  }

  override disconnectedCallback(): void {
    if (this.#subscriberId !== null) {
      unsubscribeToLanguageChanges(this.#subscriberId);
      this.#subscriberId = null;
    }
    super.disconnectedCallback();
  }

  override render() {
    return html`<h1>${this.translations?.greeting ?? ""}</h1>`;
  }
}
```



## TypeAhead

Type-ahead search over a navigable list: users type characters sequentially; the query resets after a configurable delay. Suited for lists, dropdowns, or keyboard navigation. Import from `@genexus/kasstor-webkit/type-ahead.js`.

### Usage

Create a `TypeAhead<Index>` with options that describe how to get captions and traverse indices. Call **`search(character, activeItemIndex)`** with the typed character and the current active index (or `undefined`/`null` if none). Returns the index of the first matching item, or `null` if no match.

- **Behavior:** Search is case-insensitive. Characters are accumulated until the delay (default 512 ms) passes between calls. Search starts from the next item after the active one and wraps to the start if needed. Repeating the same letter cycles through matches starting with that letter.

**Example: string array by index**

```ts
import { TypeAhead } from "@genexus/kasstor-webkit/type-ahead.js";

const items = ["Apple", "Banana", "Blueberry", "Cherry"];
const typeAhead = new TypeAhead<number>({
  getCaptionFromIndex: i => items[i],
  getFirstIndex: () => 0,
  getNextIndex: i => (i + 1 < items.length ? i + 1 : null),
  isSameIndex: (a, b) => a === b,
  delay: 400
});

let active: number | null = null;
active = typeAhead.search("b", active); // 1 (Banana)
active = typeAhead.search("b", active); // 2 (Blueberry) — same letter cycles
active = typeAhead.search("c", active); // 3 (Cherry)
```

## Frame synchronization

**`SyncWithRAF`** batches work to run on the next animation frame. Use it for scroll or resize handlers to coalesce updates and avoid layout thrash. Import from `@genexus/kasstor-webkit/sync-with-frames.js`.

### API

- **`perform(computationInFrame, computationBeforeFrame?)`** — Schedules a callback to run on the next frame. If `perform` is called multiple times before the frame, only the first `computationInFrame` runs in the frame; the optional `computationBeforeFrame` runs synchronously on every call (e.g. to capture scroll position).

- **`cancel()`** — Cancels the scheduled frame work.

**Example**

```ts
import { SyncWithRAF } from "@genexus/kasstor-webkit/sync-with-frames.js";

const sync = new SyncWithRAF();

element.addEventListener("scroll", () => {
  sync.perform(
    () => {
      updateVisibleRange();
      requestUpdate();
    },
    () => {
      scrollTop = element.scrollTop;
    }
  );
});
```

## Local storage keys

Kasstor may store references in **localStorage** to improve the user experience. Currently, the only value stored is the **user’s last selected language** (so it can be restored in future sessions). The key is exposed as **`SHARED_LOCAL_STORAGE_KEYS.LANGUAGE`**. Import from `@genexus/kasstor-webkit/shared-local-storage-keys.js`.

The goal is to **keep** the last selected language across sessions. When you clear localStorage (e.g. on logout, reset, or “clear app data”), iterate over the keys and **do not remove** this one so the user's language preference is preserved.

**Example: clearing app data while keeping the language preference**

```ts
import { SHARED_LOCAL_STORAGE_KEYS } from "@genexus/kasstor-webkit/shared-local-storage-keys.js";

function clearAppLocalStorage(): void {
  const keys = Object.keys(localStorage);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (key !== SHARED_LOCAL_STORAGE_KEYS.LANGUAGE) {
      localStorage.removeItem(key);
    }
  }
}
```

## Best practices

### i18n

**Do: use dynamic imports and type the loader**

Loader values must use **dynamic `import()`**. The bundler then code-splits: each locale is a separate chunk and is loaded only when that language is selected, improving initial load by not including unused translations in the main bundle. Type the loader as `Record<KasstorLanguage, () => Promise<YourSchema>>` so language keys and return types are checked and typos are caught.

```ts
import type { KasstorLanguage } from "@genexus/kasstor-webkit";
import type { AppTranslationsSchema } from "./translations-scheme";

const loader: Record<KasstorLanguage, () => Promise<AppTranslationsSchema>> = {
  english: () => import("./locales/en").then(m => m.default),
  spanish: () => import("./locales/es").then(m => m.default)
};
```

**Don't: static import + Promise.resolve**

Statically importing locale files and wrapping them in a Promise pulls every language into the main bundle, so users download all locales on first load.

```ts
import en from "./locales/en";
import es from "./locales/es";
const loader = {
  english: () => Promise.resolve(en),
  spanish: () => Promise.resolve(es)
};
```

**Do**

- Use a **feature ID constant** everywhere (registration, `getCurrentTranslations`, `subscribeToLanguageChanges`).

- In the subscribe callback, assign **`this.translations = newTranslations`**; the callback receives the new object for your feature.

- Call **`unsubscribeToLanguageChanges(subscriberId)`** in `disconnectedCallback` to avoid leaks.

- Call **`setInitialApplicationLanguage`** once at app startup.

- Register each feature once (e.g. in a dedicated module or at bootstrap); use a guard if the module can run multiple times (e.g. HMR or library in host).

- Await **`languageHasBeenInitialized()`** before reading language/translations when you need the first load to be complete.

**Don't**

- Register the same feature more than once per feature.

- Use static imports for locale modules in the loader.

### TypeAhead

- Create **one `TypeAhead` instance** per list and reuse it (e.g. in a class field). Do not create a new instance on every keystroke.

### SyncWithRAF

- Use **`computationBeforeFrame`** to capture values that change on every event (e.g. scroll position); use **`computationInFrame`** for DOM updates or component updates so they run once per frame.

## API Reference

### Array (`@genexus/kasstor-webkit/array.js`)

- **`insertIntoIndex<T>(array: T[], element: T, index: number): T[]`** — Inserts one element at index; mutates the array.

- **`removeIndex<T>(array: T[], index: number): T`** — Removes the element at index and returns it; mutates the array. May return `undefined` if index is out of range.

### Internationalization (`@genexus/kasstor-webkit/internationalization.js`)

- **`registerTranslations(featureId, loader)`** — Registers async loaders per language for a feature. Replaces existing loader for the same ID (e.g. HMR).

- **`setInitialApplicationLanguage(options)`** — Sets initial language from URL or client; requires `locationChangeCallback`, optional `pathname` (required on server), optional `languageChangeCallback`. Returns `{ initialLanguage, locationToReplace }`. Throws on server without `pathname`.

- **`setLanguage(language, executeLocationChange?)`** — Sets active language, loads translations, updates document/URL, notifies subscribers. Returns new pathname or `undefined`.

- **`getCurrentLanguage()`** — Returns `{ fullLanguageName, subtag }` or `undefined`.

- **`getCurrentTranslations(featureId)`** — Returns translations for current language and feature, or `undefined`.

- **`getClientLanguage()`** — Returns preferred subtag (local storage or navigator); never `null`.

- **`getLanguageFromUrl(pathname?)`** — Returns two-letter language from path, or `null`.

- **`languageHasBeenInitialized()`** — Returns a Promise that resolves when language is initialized.

- **`subscribeToLanguageChanges(featureId, callback)`** — Subscribes to language changes; returns subscriber ID.

- **`unsubscribeToLanguageChanges(subscriberId)`** — Removes subscription; returns `true` if removed.

- **`fromLanguageFullnameToSubtag(fullname)`** — Returns subtag for a full language name.

- **`fromLanguageToFullnameAndSubtag(language)`** — Returns `{ fullLanguageName, subtag }`.

- **`ALL_SUPPORTED_LANGUAGE_SUBTAGS`** — `Set` of supported subtags.

### TypeAhead (`@genexus/kasstor-webkit/type-ahead.js`)

- **`class TypeAhead<Index>`** — Type-ahead search over a generic index structure.
  - Constructor: `{ getCaptionFromIndex, getFirstIndex, getNextIndex, isSameIndex, delay? }`.
  - **`search(character: string, activeItemIndex: Index | null | undefined): Index | null`** — Returns first match for the accumulated query; resets query after `delay` ms of inactivity.

### Frame synchronization (`@genexus/kasstor-webkit/sync-with-frames.js`)

- **`class SyncWithRAF`** — Batches work to the next animation frame.
  - **`perform(computationInFrame, computationBeforeFrame?)`** — Schedules one callback for the next frame; optional immediate callback runs on every call.
  - **`cancel()`** — Cancels the scheduled frame work.

### Local storage keys (`@genexus/kasstor-webkit/shared-local-storage-keys.js`)

- **`SHARED_LOCAL_STORAGE_KEYS`** — Keys used by webkit in localStorage (e.g. `LANGUAGE` for the last selected language). Use when clearing localStorage so those keys are not left behind.

## Contributing

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more information.

