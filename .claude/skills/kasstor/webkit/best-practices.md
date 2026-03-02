# Best practices — @genexus/kasstor-webkit

## i18n

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

## TypeAhead

- Create **one `TypeAhead` instance** per list and reuse it (e.g. in a class field). Do not create a new instance on every keystroke.

## SyncWithRAF

- Use **`computationBeforeFrame`** to capture values that change on every event (e.g. scroll position); use **`computationInFrame`** for DOM updates or component updates so they run once per frame.
