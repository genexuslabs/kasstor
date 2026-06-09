// Type contract for the generated StencilJS JSX types (see `react.test-d.ts`
// for the rationale). StencilJS mirrors React's attribute model (via
// `JSXBase.HTMLAttributes`) but custom events use the capitalized `on` + name
// form (Stencil lowercases the first character back at runtime).

import type { JSXBase } from "@stencil/core/internal";
// Empty import so the bare "@stencil/core" module is known to the augmentation
// below (augmenting a module requires it to be resolvable in the program).
import type {} from "@stencil/core";

import type { ComponentProperties } from "./sample-generated.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace StencilJSX {
  export type KstField = Omit<
    JSXBase.HTMLAttributes<HTMLKstFieldElement>,
    keyof ComponentProperties.KstField
  > &
    Partial<ComponentProperties.KstField> & {
      onSelectedItemsChange?: (event: HTMLKstFieldElementSelectedItemsChangeEvent) => void;
    };

  interface IntrinsicElements {
    "kst-field": KstField;
  }
}

export type { StencilJSX };

declare module "@stencil/core" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends StencilJSX.IntrinsicElements {}
  }
}

export const stencilValidProps: StencilJSX.KstField[] = [
  { class: "field" },
  { style: { color: "red" } },
  { id: "f", role: "textbox", tabIndex: 0 },
  { "aria-hidden": "true" },
  { ref: el => void el },
  { value: "hello" },
  { onSelectedItemsChange: e => void e.detail.ids }
];

export const stencilInvalidProps: StencilJSX.KstField[] = [
  // @ts-expect-error the component property has the wrong type
  { value: 123 },
  // @ts-expect-error the custom-event handler receives the wrong event type
  { onSelectedItemsChange: (e: number) => e },
  // @ts-expect-error an unknown prop is rejected
  { thisPropDoesNotExist: true }
];
