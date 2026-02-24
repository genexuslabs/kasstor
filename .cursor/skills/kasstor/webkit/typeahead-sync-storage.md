# TypeAhead, Frame synchronization, Local storage — @genexus/kasstor-webkit

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

Kasstor may store references in **localStorage** to improve the user experience. Currently, the only value stored is the **user's last selected language** (so it can be restored in future sessions). The key is exposed as **`SHARED_LOCAL_STORAGE_KEYS.LANGUAGE`**. Import from `@genexus/kasstor-webkit/shared-local-storage-keys.js`.

The goal is to **keep** the last selected language across sessions. When you clear localStorage (e.g. on logout, reset, or "clear app data"), iterate over the keys and **do not remove** this one so the user's language preference is preserved.

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
