import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Don't report unknown attributes when 'no-unknown-attribute' is turned off", () => {
	const { diagnostics } = getDiagnostics("html`<input foo='' />`", { rules: { "no-unknown-attribute": false } });
	hasNoDiagnostics(diagnostics);
});

it("Report unknown attributes on known element", () => {
	const { diagnostics } = getDiagnostics("html`<input foo='' />`", { rules: { "no-unknown-attribute": true } });
	hasDiagnostic(diagnostics, "no-unknown-attribute");
});

it("Don't report unknown attributes", () => {
	const { diagnostics } = getDiagnostics("html`<input required />`", { rules: { "no-unknown-attribute": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report unknown attributes on unknown element", () => {
	const { diagnostics } = getDiagnostics("html`<unknown-element foo=''></unknown-element>`", {
		rules: { "no-unknown-attribute": true, "no-unknown-tag-name": false }
	});
	hasNoDiagnostics(diagnostics);
});

it("Don't report unknown data- attributes", () => {
	const { diagnostics } = getDiagnostics("html`<input data-foo='' />`", { rules: { "no-unknown-attribute": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report element expressions", () => {
	const { diagnostics } = getDiagnostics("html`<input ${x} />`", { rules: { "no-unknown-attribute": true } });
	hasNoDiagnostics(diagnostics);
});
