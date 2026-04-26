import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it } from "vitest";

it("Don't report unknown properties when 'no-unknown-property' is turned off", () => {
	const { diagnostics } = getDiagnostics("html`<input .foo='${''}' />`", { rules: { "no-unknown-property": false } });
	hasNoDiagnostics(diagnostics);
});

it("Report unknown properties on known element", () => {
	const { diagnostics } = getDiagnostics("html`<input .foo='${''}' />`", { rules: { "no-unknown-property": true } });
	hasDiagnostic(diagnostics, "no-unknown-property");
});

it("Don't report known properties", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["foo: string"] }), "html`<my-element .foo='${''}'></my-element>`"], {
		rules: { "no-unknown-property": true }
	});
	hasNoDiagnostics(diagnostics);
});

it("Don't report unknown properties on unknown element", () => {
	const { diagnostics } = getDiagnostics("html`<unknown-element .foo='${''}'></unknown-element>`", {
		rules: { "no-unknown-property": true, "no-unknown-tag-name": false }
	});
	hasNoDiagnostics(diagnostics);
});
