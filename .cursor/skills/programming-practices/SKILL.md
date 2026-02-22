---
name: programming-practices
description: Apply consistent naming and coding conventions when writing or editing code or documentation. Use when writing or editing any JSDoc or any readme.md (and when naming event handlers/callbacks, formatting, or when the user asks about coding style or best practices).
---

# Programming practices

**When editing documentation (README, JSDoc, API Reference):** Prefer bullets over long paragraphs, and **add a blank line between each list item** — see section [Lists: add line breaks between items](#lists-add-line-breaks-between-items).

## Formatting: Prettier-style and line length

- **Always** format code examples (in README, JSDoc, or source files) as Prettier would. This repo uses Prettier with **printWidth 80**, **2 spaces**, semicolons, double quotes.

- **After** writing or editing code in the repo, run Prettier on the changed files so examples and snippets stay consistent:
  - From repo root: `bunx prettier --write <file-or-dir>`
  - Or from a package: `bun run` the script that runs Prettier (e.g. lint-staged or format).

- **Rules** when writing examples (including inside **JSDoc `@example` blocks**, README code fences, or any snippet):
  - Max **80 characters** per line; break long lines (imports, chained calls, template literals).
  - **Arrow functions:** always put the body on the next line(s); never write `() => { foo(); }` or `() => bar()` on a single line when the body has a call or statement.
  - Use **2 spaces** for indentation. One statement or logical step per line.
  - **Blank lines:** add a blank line between logical groups in the example (e.g. between setup and the first demo, or between "without X" and "with X"). Avoid long runs of code without spacing; it is harder to read.
  - Apply these rules to **every** code example you add or edit, including in `.ts` JSDoc.

## Documentation code examples: TypeScript and variable names

- **Use TypeScript in examples:** Code examples in READMEs and JSDoc should be written as TypeScript (`.ts`): use explicit types where they help (e.g. loader type, schema type). For **imports from the documented package**, use the exact subpath that the package exposes in its **`exports`** field (e.g. `@genexus/kasstor-webkit/internationalization.js`), so the example works when copied. For local project imports (e.g. `./feature-ids`), follow the project's convention (with or without extension).

- **Do not shorten variable names in documentation.** Use descriptive names so readers understand at a glance what each variable holds (e.g. `currentLanguage` instead of `lang`, `currentTranslations` or `translations` instead of `t`). Short names like `t` or `lang` are hard to follow in docs.

Example — avoid:
```ts
#performEvent = () => { this.myEvent.emit(detail, { bubbles: false }); }
```

Example — prefer:
```ts
#performEvent = () => {
  this.myEvent.emit(detail, { bubbles: false });
}
```

## Code examples: efficiency and performance

- **Write examples to be as efficient as possible.** Prefer performant JavaScript/TypeScript and avoid unnecessary work.

- **Avoid:**
  - Extra iterations (e.g. one loop to collect items and another to process them when a single pass suffices).
  - Mutating the same structure you are iterating over (e.g. removing from `localStorage` while looping by index over it).
  - Redundant computations or repeated lookups that could be done once.

- **Prefer:** Iterate over a snapshot when you need to remove items (e.g. `Object.keys(localStorage)` then loop and `removeItem`), so you never mutate while iterating. Single-pass logic and minimal unnecessary allocations.

- Apply to code in READMEs, JSDoc `@example` blocks, and any snippet you add or edit.

Example — avoid (mutating while iterating by index):
```ts
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key !== null && key !== KEEP_KEY) localStorage.removeItem(key);
}
```

Example — prefer (iterate over a snapshot; no mutation of the iterated structure):
```ts
const keys = Object.keys(localStorage);
for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  if (key !== KEEP_KEY) localStorage.removeItem(key);
}
```

## Documentation: prefer bullets over long paragraphs

- **Prefer** describing properties, options, or behavioral aspects of a function/API as **bullet points** instead of a single long paragraph.

- Long blocks of text reduce readability and make it harder to scan; bullets make each point easy to find and compare.
- Use a short lead sentence if needed, then list the details as bullets (e.g. "Behavior:", "Options:", "Restrictions:").

Example — avoid:
```ts
/** Sends the request. The callback is invoked before willUpdate and before firstWillUpdate. On initial load it only runs when the value is not undefined. It works with SSR and setting a property inside does not trigger an extra update. */
```

Example — prefer:
```ts
/**
 * Sends the request when observed properties change.
 * - Callback runs before `willUpdate` (and before `firstWillUpdate`).
 * - On initial load, runs only if the value is not `undefined`.
 * - Works with SSR.
 * - Setting a property inside the callback does not trigger an extra update.
 */
```

## Lists: add line breaks between items

**Rule:** Add a **blank line between each list item** (bullet or numbered) in READMEs, JSDoc, API Reference, and any docs. Do not write consecutive list items without a blank line in between.

- **When editing lists:** Apply this before finishing; it is mandatory for this project’s documentation style.

- **Details and examples:** See [reference-documentation-lists.md](reference-documentation-lists.md) in this skill folder.

## Event and callback naming

- **Avoid** the pattern `handleEventName` (e.g. `handleClick`, `handleSubmit`, `handleChange`) for event handlers and callbacks.

- **Prefer** action-oriented names that describe what the code does, not that it “handles” something:
  - `performEvent`, `emitChange`, `submitForm`, `openDialog`, `closePanel`
  - For DOM event callbacks: `onClick`, `onSubmit` is acceptable when it clearly refers to the DOM event; otherwise prefer a verb that describes the action (e.g. `submitForm` instead of `handleSubmit`).
- When editing existing code, **preserve** the project’s existing naming (e.g. if the codebase uses `performEvent`, do not rename to `handleClick` or similar).

## When to apply

- Adding or renaming methods that are used as event handlers or passed as callbacks.

- Writing or updating examples in documentation, JSDoc, or README.

- **After writing or editing any code or code examples:** run Prettier on the modified files (`bunx prettier --write <path>`) so formatting matches the project (printWidth 80, 2 spaces).

- Reviewing or refactoring code that uses “handle*” for handlers.

## README and JSDoc alignment

- **When writing doc examples:** Use TypeScript in code snippets; use descriptive variable names (e.g. `currentLanguage` not `lang`, `translations` not `t`); run Prettier after edits.

- **Keep READMEs in sync with JSDoc:** When a package exposes an API (functions, decorators, directives), the README should reflect the same behavior, parameters, return values, and examples as the JSDoc of each exported item.

- **When to update the README:**
  - After adding or changing JSDoc for an exported API (e.g. new bullets under "Behavior:", new `@param`/`@returns`, new `@example`): update the corresponding section in the package README so the high-level docs stay accurate.
  - When introducing a new exported utility: add a README section (and, if applicable, an API Reference entry) that matches the JSDoc summary, behavior, and at least one example.

- **What to align:**
  - Description and "Behavior" (or "Options", "Restrictions") bullets in the README should match the JSDoc.
  - README code examples should use the same API as the JSDoc examples (e.g. call style, return values).
  - API Reference one-liners should match the JSDoc summary and key details (e.g. "returns void", "returns a stop function").

- **Apply** when editing documentation for any package that has both JSDoc on the source and a README that documents the same API.

## API Reference and long descriptions: use bullets

- **Segment long descriptions into bullet points** instead of a single long sentence or paragraph. If an API Reference entry (or similar summary) packs more than two clauses or runs over roughly two lines, split it into a short lead line plus bullets so each point is easy to scan.

- Apply in API Reference sections, JSDoc summaries, and any list of APIs where a description has become a dense block of text.

## Documentation: grammar and typos

- **Ensure documentation is grammatically correct and free of typos.** This applies to READMEs, JSDoc (summaries, `@param`, `@returns`, descriptions, `@example` comments), API Reference entries, and any user-facing text.

- **Watch for:**
  - Repeated words that read like a typo (e.g. "state—state" → rephrase to "state: values that..." or similar).
  - Spelling errors, wrong verb forms, and missing or extra articles.
  - Inconsistent terminology (e.g. "signal" vs "Signal" when referring to the same thing).

- **When editing docs:** skim the changed sentences for clarity and correct grammar; fix obvious typos in the same file or in related docs.

## Summary

| Prefer | Avoid |
|--------|--------|
| `performEvent`, `submitForm`, `emitChange` | `handleClick`, `handleSubmit`, `handleChange` |
| Action describes what happens | Name only states that something is “handled” |
