import {
  Component,
  SSRLitElement
} from "@genexus/kasstor-core/decorators/component.js";

import { html } from "lit";
import styles from "./layout.scss?inline";

@Component({
  styles,
  tag: "kst-layout"
})
export class KstLayout extends SSRLitElement {
  hotReplacedCallback() {
    // this should kick off re-rendering
    this.requestUpdate();
  }

  override render() {
    return html`<div>123</div>
      <input type="text" />`;
  }
}

