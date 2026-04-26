import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it.skip("Emits 'no-invalid-boolean-binding' diagnostic when a boolean binding is used on a non-boolean type", () => {
	const { diagnostics } = getDiagnostics('html`<input ?type="${true}" />`');
	hasDiagnostic(diagnostics, "no-invalid-boolean-binding");
});

it.skip("Emits no 'no-invalid-boolean-binding' diagnostic when the rule is turned off", () => {
	const { diagnostics } = getDiagnostics('html`<input ?type="${true}" />`', { rules: { "no-invalid-boolean-binding": "off" } });
	hasNoDiagnostics(diagnostics);
});

it.skip("Emits no 'no-invalid-boolean-binding' diagnostic when a boolean binding is used on a boolean type", () => {
	const { diagnostics } = getDiagnostics('html`<input ?disabled="${true}" />`');
	hasNoDiagnostics(diagnostics);
});
