// Render entry for the helper-edit spec. Imports the component that depends
// on `helper-marker.ts`, so editing the helper must invalidate this whole
// chain on the next `ssrLoadModule` call.

import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";

import "./component-helper-deps.js";

export async function renderApp(): Promise<string> {
  const template = html`<helper-test-component></helper-test-component>`;
  return await collectResult(render(template));
}
