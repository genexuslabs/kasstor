import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Non-boolean-binding with an empty string value is valid", () => {
	const { diagnostics } = getDiagnostics('html`<input required="" />`', { rules: { "no-boolean-in-attribute-binding": true } });
	hasNoDiagnostics(diagnostics);
});

it("Non-boolean-binding with a boolean type expression is not valid", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${true}" />`', { rules: { "no-boolean-in-attribute-binding": true } });
	hasDiagnostic(diagnostics, "no-boolean-in-attribute-binding");
});

it("Non-boolean-binding on a boolean type attribute with a non-boolean type expression is not valid", () => {
	const { diagnostics } = getDiagnostics('html`<input required="${{} as string}" />`', { rules: { "no-boolean-in-attribute-binding": true } });
	hasDiagnostic(diagnostics, "no-boolean-in-attribute-binding");
});

it("Boolean assigned to 'true|'false' doesn't emit 'no-boolean-in-attribute-binding' warning", () => {
	const { diagnostics } = getDiagnostics('let b: boolean = true; html`<input aria-expanded="${b}" />`', {
		rules: { "no-boolean-in-attribute-binding": true }
	});
	hasNoDiagnostics(diagnostics);
});
