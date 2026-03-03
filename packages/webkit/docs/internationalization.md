# Internationalization (i18n) — @genexus/kasstor-webkit

Multi-language support with async translation loaders, language detection, URL/path handling, and subscription to language changes. Import from
`@genexus/kasstor-webkit/internationalization.js`.

### Feature ID: what is a "feature"?

A **feature** is the scope of a set of translations. The term is intentionally broad: a feature can be the whole application, a module, or **a single component**. You can register one feature for shared/app-wide strings, another per area (e.g. "trial", "common"), or one per component. Each component (or base class) then uses the same `featureId` in `getCurrentTranslations` and `subscribeToLanguageChanges`. The same ID is used when calling `registerTranslations` for that feature.

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

3. **Loader with dynamic imports** — Build an object that maps each `KasstorLanguage` to a function that returns `import("./locales/xx").then(m => m.default)` (or `m.language`). Use **dynamic `import()`** only; see [best-practices.md](best-practices.md#i18n).

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

export type AppTranslationsSchema<T extends AppMetadata["featureId"]> = T extends "header"
  ? HeaderTranslationsSchema
  : FooterTranslationsSchema;
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

export const AppComponent = <Metadata extends AppMetadata, T extends typeof AppElement<Metadata>>(
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

If you don't use a custom decorator, use `@Component` from `@genexus/kasstor-core/decorators/component.js` and pass `metadata: { featureId: "header" }` (or `"footer"`) in the options; the base class and concrete components stay the same.

**Alternative: single component (no base class)**

If you prefer not to use a base class, subscribe in `connectedCallback` and unsubscribe in `disconnectedCallback`; in the callback, set `this.translations = newTranslations`.

```ts
import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import {
  getCurrentTranslations,
  subscribeToLanguageChanges,
  unsubscribeToLanguageChanges
} from "@genexus/kasstor-webkit/internationalization.js";
import { html } from "lit";
import { state } from "lit/decorators";
import { GREETING_FEATURE_ID } from "../common/feature-ids";

/**
 * Greeting that subscribes to i18n changes for a feature; no base class.
 * @access public
 */
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
    super.disconnectedCallback();
    if (this.#subscriberId !== null) {
      unsubscribeToLanguageChanges(this.#subscriberId);
      this.#subscriberId = null;
    }
  }

  override render() {
    return html`<h1>${this.translations?.greeting ?? ""}</h1>`;
  }
}
```

