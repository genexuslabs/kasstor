// Type contract for the generated React JSX types. It reconstructs the full
// structure that `getReactDeclaration` produces for `<kst-field>` (the
// `ComponentPropertiesReact` namespace + the `ReactJSX` namespace + the
// `declare module "react"` augmentation) so that tsc verifies both the
// augmentation compiles and that the prop types accept the standard React
// attributes, the component property and the event handlers — and reject
// wrong/unknown values. The exact generated text is locked by the
// `get-framework-types` snapshots.
//
// The generated React file declares its own `ComponentPropertiesReact`
// namespace (it is NOT part of the core `components.ts` file), re-declaring each
// prop so editors resolve the JSDoc on hover, so this contract declares it
// locally too (mirroring `solid.test-d.ts`).

import type {
  DetailedHTMLProps as ReactDetailedHTMLProps,
  HTMLAttributes as ReactHTMLAttributes
} from "react";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ComponentPropertiesReact {
  export type KstField = {
    value?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace ReactJSX {
  export type KstField = Omit<
    ReactDetailedHTMLProps<ReactHTMLAttributes<HTMLKstFieldElement>, HTMLKstFieldElement>,
    keyof ComponentPropertiesReact.KstField | "onInput"
  > &
    ComponentPropertiesReact.KstField & {
      // Native event re-typed under React's own handler prop name (`onInput` is
      // omitted from the base attributes above, so this overrides the synthetic
      // handler with the component's own event type).
      onInput?: (event: HTMLKstFieldElementInputEvent) => void;
      // Custom event: verbatim `on` + name.
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
// intersecting HTMLAttributes), the component property, a non-overridden native
// event handler (synthetic, from HTMLAttributes), the re-typed native event
// handler (the component's own event type), and the custom event handler
// (verbatim `on` + name, correctly typed).
export const reactValidProps: ReactJSX.KstField[] = [
  { className: "field" },
  { style: { color: "red" } },
  { id: "f", title: "t", role: "textbox", hidden: true, tabIndex: 0 },
  { "aria-hidden": true },
  { ref: el => void el },
  { children: null },
  { value: "hello" },
  { onClick: e => void e.button },
  { onInput: e => void e.detail.value },
  { onselectedItemsChange: e => void e.detail.ids }
];

export const reactInvalidProps: ReactJSX.KstField[] = [
  // @ts-expect-error the component property has the wrong type
  { value: 123 },
  // @ts-expect-error the re-typed native handler receives the wrong event type
  { onInput: (e: number) => e },
  // @ts-expect-error the custom-event handler receives the wrong event type
  { onselectedItemsChange: (e: number) => e },
  // @ts-expect-error an unknown prop is rejected
  { thisPropDoesNotExist: true }
];
