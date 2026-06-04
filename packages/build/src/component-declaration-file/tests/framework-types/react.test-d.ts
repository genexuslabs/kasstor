// Type contract for the generated React JSX types. It reconstructs the full
// structure that `getReactDeclaration` produces for `<kst-field>` (the
// `ReactJSX` namespace + the `declare module "react"` augmentation) so that tsc
// verifies both the augmentation compiles and that the prop types accept the
// standard React attributes, the component property and the custom-event
// handler (and reject wrong/unknown values). The exact generated text is locked
// by the `get-framework-types` snapshots.

import type {
  DetailedHTMLProps as ReactDetailedHTMLProps,
  HTMLAttributes as ReactHTMLAttributes
} from "react";

import type { ComponentProperties } from "./sample-generated.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace ReactJSX {
  export type KstField = Omit<
    ReactDetailedHTMLProps<ReactHTMLAttributes<HTMLKstFieldElement>, HTMLKstFieldElement>,
    keyof ComponentProperties.KstField
  > &
    Partial<ComponentProperties.KstField> & {
      onselectedItemsChange?: (event: HTMLKstFieldElementSelectedItemsChangeEvent) => void;
    };

  interface IntrinsicElements {
    "kst-field": KstField;
  }
}

export type { ReactJSX };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

// All of these are accepted: standard React/DOM attributes (the point of
// intersecting HTMLAttributes), the component property, native event handlers
// (synthetic, camelCase, from HTMLAttributes), and the custom event handler
// (verbatim `on` + name, correctly typed).
export const reactValidProps: ReactJSX.KstField[] = [
  { className: "field" },
  { style: { color: "red" } },
  { id: "f", title: "t", role: "textbox", hidden: true, tabIndex: 0 },
  { "aria-hidden": true },
  { ref: el => void el },
  { children: null },
  { value: "hello" },
  { onInput: e => void e.currentTarget },
  { onClick: e => void e.button },
  { onselectedItemsChange: e => void e.detail.ids }
];

export const reactInvalidProps: ReactJSX.KstField[] = [
  // @ts-expect-error the component property has the wrong type
  { value: 123 },
  // @ts-expect-error the custom-event handler receives the wrong event type
  { onselectedItemsChange: (e: number) => e },
  // @ts-expect-error an unknown prop is rejected
  { thisPropDoesNotExist: true }
];
