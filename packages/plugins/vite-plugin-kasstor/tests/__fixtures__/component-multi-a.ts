// Placeholder component A — the multi-component specs overwrite this file
// at test time. The on-disk content is restored at the end of each test.

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "multi-test-a" })
export class MultiTestA extends KasstorElement {
  override render() {
    return html`<p data-tag="a">__placeholder_a__</p>`;
  }
}
