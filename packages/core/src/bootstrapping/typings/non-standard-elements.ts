import type { StandardElementTagNames } from "./already-defined-elements";

/**
 *
 */
export type CustomElementTagNames = Exclude<
  keyof HTMLElementTagNameMap,
  StandardElementTagNames
>;
