import type { CustomElementTagNames } from "./non-standard-elements";

export type LibraryComponents<Prefix extends LibraryPrefix> = Extract<
  CustomElementTagNames,
  `${Prefix}${string}`
>;

export type LibraryPrefix = `${string}-`;
