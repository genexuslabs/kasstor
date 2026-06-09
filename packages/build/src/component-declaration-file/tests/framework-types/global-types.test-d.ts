// Type contract for the generated `declare global` block (emitted into
// components.ts by `getGlobalTypeDeclarations`). It reconstructs the exact shape
// the generator produces for a sample `<kst-button>` and asserts it type-checks
// and behaves: `querySelector` returns the host element type, the host extends
// the component class, and `addEventListener` types the event/detail. The exact
// generated text is locked by the `get-global-types` snapshots.
//
// A distinct component name (`KstButton`) is used so the ambient declarations
// here don't collide with the other contracts in this folder.

// Stands in for the component class imported into components.ts as
// `import type { KstButton as KstButtonElement } from "./kst-button.lit.ts"`.
declare class KstButtonElement extends HTMLElement {
  disabled: boolean;
}

type ValueChangeDetail = { value: string };

declare global {
  interface HTMLKstButtonElementCustomEvent<T> extends CustomEvent<T> {
    detail: T;
    target: HTMLKstButtonElement;
  }

  type HTMLKstButtonElementValueChangeEvent = HTMLKstButtonElementCustomEvent<
    HTMLKstButtonElementEventMap["valueChange"]
  >;

  interface HTMLKstButtonElementEventMap {
    valueChange: ValueChangeDetail;
  }

  interface HTMLKstButtonElementEventTypes {
    valueChange: HTMLKstButtonElementValueChangeEvent;
  }

  interface HTMLKstButtonElement extends KstButtonElement {
    addEventListener<K extends keyof HTMLKstButtonElementEventTypes>(
      type: K,
      listener: (this: HTMLKstButtonElement, ev: HTMLKstButtonElementEventTypes[K]) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener<K extends keyof DocumentEventMap>(
      type: K,
      listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener<K extends keyof HTMLElementEventMap>(
      type: K,
      listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface HTMLElementTagNameMap {
    "kst-button": HTMLKstButtonElement;
  }
}

// `querySelector` returns the host element type (via HTMLElementTagNameMap).
export const queried: HTMLKstButtonElement | null = document.querySelector("kst-button");

// The host element exposes the component class members.
export const readsClassMember = () => queried?.disabled === true;

// `addEventListener` types the event and its `detail` from the event maps.
export const listensToCustomEvent = () =>
  queried?.addEventListener("valueChange", event => event.detail satisfies ValueChangeDetail);

// Native events keep their standard typing.
export const listensToNativeEvent = () => queried?.addEventListener("click", event => event.button);
