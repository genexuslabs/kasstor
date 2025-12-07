/**
 * TypeScript utility type to convert an object type into an array of key-value pairs.
 * Each entry in the array is a tuple where the first element is the key and the second element is the value.
 */
export type ObjectEntries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

