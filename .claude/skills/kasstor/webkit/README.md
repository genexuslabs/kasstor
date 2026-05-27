# @genexus/kasstor-webkit

Utilities for web applications: array helpers, internationalization (i18n), type-ahead search, frame synchronization, per-root `adoptedStyleSheets` adoption with shared reference counting, and shared local storage keys.

## API Reference

Consult this table to choose which document to load. Details and examples are in the linked sub-readmes.

### Array ([array.md](array.md))

| API | Description |
|-----|-------------|
| [insertIntoIndex](array.md#insertintoindex) | Inserts one element at a given index. Mutates the array; elements at and after the index shift right. Does not return a value. Uses `splice`. |
| [removeIndex](array.md#removeindex) | Removes element at index and returns it. Mutates the array; subsequent elements shift left. Returns the removed element (or `undefined` if index out of range). Uses `splice`. |

### Internationalization ([internationalization.md](internationalization.md))

| API | Description |
|-----|-------------|
| [registerTranslations](internationalization.md) | Registers async loaders per language for a feature. Replaces existing loader for the same ID (e.g. HMR). |
| [setInitialApplicationLanguage](internationalization.md) | Sets initial language from URL or client; requires `locationChangeCallback`, optional `pathname` (required on server), optional `languageChangeCallback`. Returns `{ initialLanguage, locationToReplace }`. Throws on server without `pathname`. |
| [setLanguage](internationalization.md) | Sets active language, loads translations, updates document/URL, notifies subscribers. Returns new pathname or `undefined`. |
| [setAvailableLanguages](internationalization.md#setavailablelanguages) | Updates `availableLanguages` and/or `defaultLanguage` at runtime. If the current language is no longer available, resolves a new one from `navigator.languages` then the default and triggers a standard language change. Requires at least one option; coerces invalid lists with dev-mode warnings. |
| [languageChangeComplete](internationalization.md#languagechangecomplete) | Returns a Promise that resolves when the in-flight `setLanguage` finishes loading translations and notifying subscribers. Burst-safe: only the latest change's promise resolves. Already-resolved when no change is in flight. |
| [getCurrentLanguage](internationalization.md) | Returns `{ fullLanguageName, subtag }` or `undefined`. |
| [getCurrentTranslations](internationalization.md) | Returns translations for current language and feature, or `undefined`. |
| [getClientLanguage](internationalization.md) | Returns preferred subtag (local storage or navigator); never `null`. |
| [getLanguageFromUrl](internationalization.md) | Returns two-letter language from path, or `null`. |
| [languageHasBeenInitialized](internationalization.md) | Returns a Promise that resolves when language is initialized. |
| [subscribeToLanguageChanges](internationalization.md) | Subscribes to language changes; returns subscriber ID. |
| [unsubscribeToLanguageChanges](internationalization.md) | Removes subscription; returns `true` if removed. |
| [fromLanguageFullnameToSubtag](internationalization.md) | Returns subtag for a full language name. |
| [fromLanguageToFullnameAndSubtag](internationalization.md) | Returns `{ fullLanguageName, subtag }`. |
| [ALL_SUPPORTED_LANGUAGE_SUBTAGS](internationalization.md) | `Set` of supported subtags. |

### Stylesheets ([stylesheets.md](stylesheets.md))

Import from `@genexus/kasstor-webkit/stylesheets.js` (or the package root).

| API | Description |
|-----|-------------|
| [addStyleSheet](stylesheets.md#addstylesheet) | Adopts a `CSSStyleSheet` into a `Document` or `ShadowRoot` with shared reference counting. Pushed into `node.adoptedStyleSheets` only on the first reference. |
| [removeStyleSheet](stylesheets.md#removestylesheet) | Releases one reference; physically removes the sheet on the last reference. Safe to call defensively. |
| [addGlobalStyleSheet](stylesheets.md#addglobalstylesheet) | Adopts a sheet into whichever root (`Document` or `ShadowRoot`) currently contains the element. Idempotent per `(element, sheet)` pair; shares the per-root reference count with `addStyleSheet`. Snapshots the root for cleanup in `disconnectedCallback`. |
| [removeGlobalStyleSheet](stylesheets.md#removeglobalstylesheet) | Releases the reference held by an element on a sheet; no-op if it was never registered. Typically called from `disconnectedCallback`. |

### TypeAhead, Frame sync, Local storage ([typeahead-sync-storage.md](typeahead-sync-storage.md))

| API | Description |
|-----|-------------|
| [TypeAhead](typeahead-sync-storage.md#typeahead) | Type-ahead search over a generic index structure. Constructor: `{ getCaptionFromIndex, getFirstIndex, getNextIndex, isSameIndex, delay? }`. `search(character, activeItemIndex)` returns first match; resets query after `delay` ms. Case-insensitive; wraps to start; same letter cycles. |
| [SyncWithRAF](typeahead-sync-storage.md#frame-synchronization) | Batches work to the next animation frame. `perform(computationInFrame, computationBeforeFrame?)` — schedules one callback for next frame; optional immediate callback runs on every call. `cancel()` — cancels scheduled frame work. |
| [SHARED_LOCAL_STORAGE_KEYS](typeahead-sync-storage.md#local-storage-keys) | Keys used by webkit in localStorage (e.g. `LANGUAGE` for last selected language). Use when clearing localStorage so those keys are not left behind. |

## Installation

```bash
npm i @genexus/kasstor-webkit
```
