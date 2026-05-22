// Tiny SSR entry that the spec drives via `server.ssrLoadModule`.
// Importing `./component.js` (which the test mutates between renders) is
// what makes this module sensitive to the dependency-tracking behavior
// the plugin needs to fix.

import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";

import "./component.js";

export async function renderApp(): Promise<string> {
  const template = html`<cache-test-component></cache-test-component>`;
  return await collectResult(render(template));
}
