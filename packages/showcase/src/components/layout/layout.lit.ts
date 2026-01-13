import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";

import { html } from "lit";
import styles from "./layout.scss?inline";

import { state } from "lit/decorators.js";

@Component({
  styles,
  tag: "kst-layout"
})
export class KstLayout extends KasstorElement {
  @state() value: string = "1";

  override render() {
    return html`<div>aasdasda</div>
      <kst-playground></kst-playground>
      <select
        @change=${(e: Event) =>
          (this.value = (e.target as HTMLSelectElement).value)}
      >
        <option value="1" .selected=${this.value === "1"}>option 1</option>
        <option value="2" .selected=${this.value === "2"}>option 2</option>
        <option value="3" .selected=${this.value === "3"}>option 3</option>
      </select>`;
  }
}

// ######### Auto generated bellow #########

declare global {
  // prettier-ignore
  interface HTMLKstLayoutElementCustomEvent<T> extends CustomEvent<T> {
    detail: T;
    target: HTMLKstLayoutElement;
  }

  // prettier-ignore
  interface HTMLKstLayoutElement extends KstLayout {
    // Extend the KstLayout class redefining the event listener methods to improve type safety when using them
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    
    removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

  interface IntrinsicElements {
    "kst-layout": HTMLKstLayoutElement;
  }

  interface HTMLElementTagNameMap {
    "kst-layout": HTMLKstLayoutElement;
  }
}

