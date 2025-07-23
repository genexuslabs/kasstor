import type { FilterKeys } from "./filter-keys";

export type LibraryComponents<Prefix extends string> = FilterKeys<
  HTMLElementTagNameMap,
  `${Prefix}${string}`
>;
