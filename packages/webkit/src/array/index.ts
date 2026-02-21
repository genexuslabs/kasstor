/**
 * Inserts a single element at a specific index. Mutates the array in place.
 *
 * @param array - Array to modify.
 * @param element - Element to insert.
 * @param index - Zero-based index at which to insert (0 ≤ index ≤ array.length).
 *
 * Behavior:
 * - Uses `Array.prototype.splice`; existing elements shift right.
 * - Does not return a value (void).
 */
export const insertIntoIndex = <T>(array: T[], element: T, index: number): T[] =>
  array.splice(index, 0, element);

/**
 * Removes the element at a single index and returns it. Mutates the array in place.
 *
 * @param array - Array to modify.
 * @param index - Zero-based index to remove.
 * @returns The removed element.
 *
 * Behavior:
 * - Uses `Array.prototype.splice`; subsequent elements shift left.
 * - If index is out of range, returns `undefined` (splice behavior).
 */
export const removeIndex = <T>(array: T[], index: number): T => array.splice(index, 1)[0];
