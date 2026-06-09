// Type-level test (checked in isolation by `tsconfig.type-tests.json`, never by
// the regular build) for the global typing of `@Component`'s
// `sharedDesignSystemStyles` option.
//
// It augments the global `KasstorSharedDesignSystemStyles` registry — exactly as
// a consuming application would, in a single place — and asserts that, from then
// on, `sharedDesignSystemStyles` only accepts the registered bundle names and
// rejects anything else. (The non-augmented fallback to `string[]` is covered by
// the regular `tsc --noEmit` build, where the rest of the package keeps passing
// arbitrary string names.)

import type { ComponentOptions, SharedDesignSystemStyleName } from "../../types";

declare global {
  // Only these two bundle names become valid across the whole program.
  interface KasstorSharedDesignSystemStyles {
    "components/button": true;
    "utils/tokens": true;
  }
}

// Once augmented, the derived name type is the union of the registered keys
// (exported so `no-unused-vars` does not flag the assignments).
export const validStyleName: SharedDesignSystemStyleName = "components/button";
// @ts-expect-error "typo" is not a registered shared design-system style name
export const invalidStyleName: SharedDesignSystemStyleName = "typo";

// Valid: every entry is a registered bundle name (and the option is optional).
export const validOptions: ComponentOptions<"kst-", unknown> = {
  tag: "kst-button",
  sharedDesignSystemStyles: ["components/button", "utils/tokens"]
};

export const withoutStyles: ComponentOptions<"kst-", unknown> = {
  tag: "kst-plain"
};

export const invalidOptions: ComponentOptions<"kst-", unknown> = {
  tag: "kst-bad",
  // @ts-expect-error "typo" is not a registered shared design-system style name
  sharedDesignSystemStyles: ["components/button", "typo"]
};
