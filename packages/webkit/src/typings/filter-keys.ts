/**
 * Useful to filtering the keys of an object by pattern matching the keys. For
 * example, all Chameleon controls:
 *
 * @example
 * ```ts
 * type ChameleonControlsTagName = FilterObjectKeys<
 *   HTMLElementTagNameMap,
 *   `ch-${string}`
 * >
 * ```
 */
export type FilterObjectKeys<T, U> = {
  [K in keyof T]: K extends U ? K : never;
}[keyof T];
