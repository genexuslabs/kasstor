// Render entry for the multi-component specs: imports both component fixtures
// (the test mutates them) and renders both inside a single SSR template.

import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";

import "./component-multi-a.js";
import "./component-multi-b.js";

export async function renderApp(): Promise<string> {
  const template = html`<multi-test-a></multi-test-a><multi-test-b></multi-test-b>`;
  return await collectResult(render(template));
}
