# @genexus/kasstor-webkit

Utilities for web applications: array helpers, internationalization (i18n), type-ahead search, frame synchronization, per-root `adoptedStyleSheets` adoption with shared reference counting, and shared local storage keys.

## API Reference

Consult this table to choose which document to load. Details and examples are in the linked sub-readmes.

### Array ([docs/array.md](docs/array.md))

| API | Description |
|-----|-------------|
| [insertIntoIndex](docs/array.md#insertintoindex) | Inserts one element at a given index. Mutates the array; elements at and after the index shift right. Does not return a value. Uses `splice`. |
| [removeIndex](docs/array.md#removeindex) | Removes element at index and returns it. Mutates the array; subsequent elements shift left. Returns the removed element (or `undefined` if index out of range). Uses `splice`. |

### Internationalization ([docs/internationalization.md](docs/internationalization.md))

| API | Description |
|-----|-------------|
| [registerTranslations](docs/internationalization.md) | Registers async loaders per language for a feature. Replaces existing loader for the same ID (e.g. HMR). |
| [setInitialApplicationLanguage](docs/internationalization.md) | Sets initial language from URL or client; requires `locationChangeCallback`, optional `pathname` (required on server), optional `languageChangeCallback`. Returns `{ initialLanguage, locationToReplace }`. Throws on server without `pathname`. |
| [setLanguage](docs/internationalization.md) | Sets active language, loads translations, updates document/URL, notifies subscribers. Returns new pathname or `undefined`. |
| [setAvailableLanguages](docs/internationalization.md#setavailablelanguages) | Updates `availableLanguages` and/or `defaultLanguage` at runtime. If the current language is no longer available, resolves a new one from `navigator.languages` then the default and triggers a standard language change. Requires at least one option; coerces invalid lists with dev-mode warnings. |
| [languageChangeComplete](docs/internationalization.md#languagechangecomplete) | Returns a Promise that resolves when the in-flight `setLanguage` finishes loading translations and notifying subscribers. Burst-safe: only the latest change's promise resolves. Already-resolved when no change is in flight. |
| [getCurrentLanguage](docs/internationalization.md) | Returns `{ fullLanguageName, subtag }` or `undefined`. |
| [getCurrentTranslations](docs/internationalization.md) | Returns translations for current language and feature, or `undefined`. |
| [getClientLanguage](docs/internationalization.md) | Returns preferred subtag (local storage or navigator); never `null`. |
| [getLanguageFromUrl](docs/internationalization.md) | Returns two-letter language from path, or `null`. |
| [languageHasBeenInitialized](docs/internationalization.md) | Returns a Promise that resolves when language is initialized. |
| [subscribeToLanguageChanges](docs/internationalization.md) | Subscribes to language changes; returns subscriber ID. |
| [unsubscribeToLanguageChanges](docs/internationalization.md) | Removes subscription; returns `true` if removed. |
| [fromLanguageFullnameToSubtag](docs/internationalization.md) | Returns subtag for a full language name. |
| [fromLanguageToFullnameAndSubtag](docs/internationalization.md) | Returns `{ fullLanguageName, subtag }`. |
| [ALL_SUPPORTED_LANGUAGE_SUBTAGS](docs/internationalization.md) | `Set` of supported subtags. |

### Stylesheets ([docs/stylesheets.md](docs/stylesheets.md))

Import from `@genexus/kasstor-webkit/stylesheets.js` (or from the package root).

| API | Description |
|-----|-------------|
| [addStyleSheet](docs/stylesheets.md#addstylesheet) | Adopts a `CSSStyleSheet` into a `Document` or `ShadowRoot` with shared reference counting. Pushed into `node.adoptedStyleSheets` only on the first reference. |
| [removeStyleSheet](docs/stylesheets.md#removestylesheet) | Releases one reference; physically removes the sheet on the last reference. Safe to call defensively. |
| [addGlobalStyleSheet](docs/stylesheets.md#addglobalstylesheet) | Adopts a sheet into whichever root (`Document` or `ShadowRoot`) currently contains the element. Idempotent per `(element, sheet)` pair; shares the per-root reference count with `addStyleSheet`. Snapshots the root for cleanup in `disconnectedCallback`. |
| [removeGlobalStyleSheet](docs/stylesheets.md#removeglobalstylesheet) | Releases the reference held by an element on a sheet; no-op if it was never registered. Typically called from `disconnectedCallback`. |

### TypeAhead, Frame sync, Local storage ([docs/typeahead-sync-storage.md](docs/typeahead-sync-storage.md))

| API | Description |
|-----|-------------|
| [TypeAhead](docs/typeahead-sync-storage.md#typeahead) | Type-ahead search over a generic index structure. Constructor: `{ getCaptionFromIndex, getFirstIndex, getNextIndex, isSameIndex, delay? }`. `search(character, activeItemIndex)` returns first match; resets query after `delay` ms. Case-insensitive; wraps to start; same letter cycles. |
| [SyncWithRAF](docs/typeahead-sync-storage.md#frame-synchronization) | Batches work to the next animation frame. `perform(computationInFrame, computationBeforeFrame?)` — schedules one callback for next frame; optional immediate callback runs on every call. `cancel()` — cancels scheduled frame work. |
| [SHARED_LOCAL_STORAGE_KEYS](docs/typeahead-sync-storage.md#local-storage-keys) | Keys used by webkit in localStorage (e.g. `LANGUAGE` for last selected language). Use when clearing localStorage so those keys are not left behind. |

### Best Practices ([docs/best-practices.md](docs/best-practices.md))

i18n, TypeAhead, and SyncWithRAF best practices.

## Installation

```bash
npm i @genexus/kasstor-webkit
```

## Contributing

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for more information.
