import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it } from "vitest";

it("Report unknown custom elements", () => {
	const { diagnostics } = getDiagnostics("html`<unknown-element></unknown-element>`", { rules: { "no-unknown-tag-name": true } });
	hasDiagnostic(diagnostics, "no-unknown-tag-name");
});

it("Don't report known built in elements", () => {
	const { diagnostics } = getDiagnostics("html`<div></div>`", { rules: { "no-unknown-tag-name": true } });
	hasNoDiagnostics(diagnostics);
});

it("Report unknown built in elements", () => {
	const { diagnostics } = getDiagnostics("html`<element></element>`", { rules: { "no-unknown-tag-name": true } });
	hasDiagnostic(diagnostics, "no-unknown-tag-name");
});

it("Don't report known custom elements found in other file", () => {
	const { diagnostics } = getDiagnostics([makeElement({}), "html`<my-element></my-element>`"], { rules: { "no-unknown-tag-name": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report known custom element", () => {
	const { diagnostics } = getDiagnostics(
		"class MyElement extends HTMLElement {}; customElements.define('my-element', MyElement); html`<my-element></my-element>`",
		{
			rules: { "no-unknown-tag-name": true }
		}
	);
	hasNoDiagnostics(diagnostics);
});
