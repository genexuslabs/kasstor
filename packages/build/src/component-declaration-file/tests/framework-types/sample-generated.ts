// Mirrors the auto-generated output kasstor produces for a sample `<kst-field>`
// component, so the per-framework JSX "contracts" in this folder can type-check
// against the real framework typings.
//
//   - `KstFieldElement` + the `declare global` block mirror the per-component
//     global types appended to each component file (the host element type and
//     the custom-event type).
//   - `ComponentProperties` mirrors the namespace exported by the core
//     `components.ts` file, which the React/StencilJS files re-use. (The
//     SolidJS file declares its own `ComponentPropertiesSolidJS` namespace, so
//     it is not exported here — see `solid.test-d.ts`.)

export declare class KstFieldElement extends HTMLElement {
  value: string;
}

declare global {
  // Host element type (mirrors `getComponentHTMLInterfaceName`).
  type HTMLKstFieldElement = KstFieldElement;

  // Custom event type (mirrors `getComponentEventTypeInterfaceName`).
  type HTMLKstFieldElementSelectedItemsChangeEvent = CustomEvent<{
    ids: string[];
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentProperties {
  export type KstField = Pick<HTMLKstFieldElement, "value">;
}
