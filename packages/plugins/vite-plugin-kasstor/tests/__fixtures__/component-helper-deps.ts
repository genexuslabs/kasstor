// Component that depends on a non-component sibling module. The helper-edit
// spec edits the imported `helper-marker.ts` to confirm that file changes
// propagate through the import graph and the next SSR render reflects the
// new helper value.

import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

import { MARKER } from "./helper-marker.js";

@Component({ tag: "helper-test-component" })
export class HelperTestComponent extends KasstorElement {
  override render() {
    return html`<p>${MARKER}</p>`;
  }
}
