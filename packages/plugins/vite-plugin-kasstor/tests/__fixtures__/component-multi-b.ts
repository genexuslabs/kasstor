// Placeholder component B — the multi-component specs overwrite this file
// at test time. The on-disk content is restored at the end of each test.

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "multi-test-b" })
export class MultiTestB extends KasstorElement {
  override render() {
    return html`<p data-tag="b">__placeholder_b__</p>`;
  }
}
