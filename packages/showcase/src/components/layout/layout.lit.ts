import {
  Component,
  SSRLitElement
} from "@genexus/kasstor-core/decorators/component.js";

import { html } from "lit";
import styles from "./layout.scss?inline";

import { state } from "lit/decorators.js";
import "../playground/playground.lit";

@Component({
  styles,
  tag: "kst-layout"
})
export class KstLayout extends SSRLitElement {
  @state() value: string = "1";

  override render() {
    return html`<div>aa</div>
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

