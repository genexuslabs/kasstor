/**
 * Inserts the value in the array in the specific position.
 *
 * @param array The array where the element is added.
 * @param element The element to insert in the specific location.
 * @param index The zero-based location in the array to insert the new element.
 */
export const insertIntoIndex = <T>(array: T[], element: T, index: number) =>
  array.splice(index, 0, element);

/**
 * Removes an index from an array, returning the deleted element.
 */
export const removeIndex = <T>(array: T[], index: number): T =>
  array.splice(index, 1)[0];
