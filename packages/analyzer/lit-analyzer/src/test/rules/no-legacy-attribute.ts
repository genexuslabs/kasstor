import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Don't report legacy attributes when 'no-legacy-attribute' is turned off", () => {
	const { diagnostics } = getDiagnostics("html`<input required?=${true} />`", { rules: { "no-legacy-attribute": false } });
	hasNoDiagnostics(diagnostics);
});

it("Report legacy attributes on known element", () => {
	const { diagnostics } = getDiagnostics("html`<input required?=${true} />`", { rules: { "no-legacy-attribute": true } });
	hasDiagnostic(diagnostics, "no-legacy-attribute");
});

it("Report legacy attribute values on known element", () => {
	const { diagnostics } = getDiagnostics('html`<input value="{{foo}}" />`', { rules: { "no-legacy-attribute": true } });
	hasDiagnostic(diagnostics, "no-legacy-attribute");
});

it("Don't report non-legacy boolean attributes", () => {
	const { diagnostics } = getDiagnostics("html`<input ?required=${true} />`", { rules: { "no-legacy-attribute": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report non-legacy attributes", () => {
	const { diagnostics } = getDiagnostics("html`<input required />`", { rules: { "no-legacy-attribute": true } });
	hasNoDiagnostics(diagnostics);
});
