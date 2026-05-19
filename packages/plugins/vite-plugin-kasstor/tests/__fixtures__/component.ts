// Placeholder component — the cache-invalidation spec overwrites this file
// at test time. Whatever you commit here will be restored at the end of
// each test (and at the start of the next run).

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "cache-test-component" })
export class CacheTestComponent extends KasstorElement {
  override render() {
    return html`<p>__placeholder__</p>`;
  }
}
