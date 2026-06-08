// Type contract for the generated SolidJS JSX types (see `react.test-d.ts` for
// the rationale). SolidJS uses `class` (not `className`) and the namespaced
// `on:` directive (verbatim event name) for every event.
//
// The generated SolidJS file declares its own `ComponentPropertiesSolidJS`
// namespace (it is NOT part of the core `components.ts` file), so this contract
// declares it locally too.

import type { JSX } from "solid-js";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ComponentPropertiesSolidJS {
  export type KstField = {
    "prop:value"?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace SolidJsJSX {
  export type KstField = Omit<
    JSX.HTMLAttributes<HTMLKstFieldElement>,
    keyof ComponentPropertiesSolidJS.KstField
  > &
    ComponentPropertiesSolidJS.KstField & {
      "on:selectedItemsChange"?: (event: HTMLKstFieldElementSelectedItemsChangeEvent) => void;
    };

  interface IntrinsicElements {
    "kst-field": KstField;
  }
}

export type { SolidJsJSX };

declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends SolidJsJSX.IntrinsicElements {}
  }
}

export const solidValidProps: SolidJsJSX.KstField[] = [
  { class: "field" },
  { style: { color: "red" } },
  { id: "f", role: "textbox", tabIndex: 0 },
  { "aria-hidden": true },
  { ref: el => void el },
  { "prop:value": "hello" },
  { "on:selectedItemsChange": e => void e.detail.ids }
];

export const solidInvalidProps: SolidJsJSX.KstField[] = [
  // @ts-expect-error the component property has the wrong type
  { "prop:value": 123 },
  // @ts-expect-error the custom-event handler receives the wrong event type
  { "on:selectedItemsChange": (e: number) => e },
  // @ts-expect-error an unknown prop is rejected
  { thisPropDoesNotExist: true }
];
