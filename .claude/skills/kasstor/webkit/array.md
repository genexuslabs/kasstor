# Array utilities — @genexus/kasstor-webkit

Helpers for in-place array insertion and removal. Import from `@genexus/kasstor-webkit/array.js`.

## insertIntoIndex

Inserts a single element at a given index. Mutates the array.

- **Behavior:** Uses `splice`; elements at and after the index shift right. Does not return a value.

**Example**

```ts
import { insertIntoIndex } from "@genexus/kasstor-webkit/array.js";

const items = ["apple", "cherry", "date"];
insertIntoIndex(items, "banana", 1);
console.log(items); // ['apple', 'banana', 'cherry', 'date']
```

## removeIndex

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
