# @genexus/kasstor-webkit

Utilities for web applications: array helpers, internationalization (i18n), type-ahead search, frame synchronization, and shared local storage keys.

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
