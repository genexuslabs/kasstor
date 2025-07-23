/**
 * Useful to filtering the keys of an object by pattern matching the keys. For
 * example, all Chameleon controls:
 *
 * @example
 * ```ts
 * type ChameleonControlsTagName = FilterKeys<
 *   HTMLElementTagNameMap,
 *   `ch-${string}`
 * >
 * ```
 */
export type FilterKeys<T, U> = {
  [K in keyof T]: K extends U ? K : never;
}[keyof T];
