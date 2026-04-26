import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it('Report mixed binding with expression and "', () => {
	const { diagnostics } = getDiagnostics('html`<input value=${"foo"}" />`');
	hasDiagnostic(diagnostics, "no-unintended-mixed-binding");
});

it("Report mixed binding with expression and '", () => {
	const { diagnostics } = getDiagnostics("html`<input value=${'foo'}' />`");
	hasDiagnostic(diagnostics, "no-unintended-mixed-binding");
});

it("Report mixed binding with expression and }", () => {
	const { diagnostics } = getDiagnostics("html`<input value=${'foo'}} />`");
	hasDiagnostic(diagnostics, "no-unintended-mixed-binding");
});

it("Report mixed binding with expression and /", () => {
	const { diagnostics } = getDiagnostics("html`<input value=${'foo'}/>`");
	hasDiagnostic(diagnostics, "no-unintended-mixed-binding");
});

it("Don't report mixed binding with expression and %", () => {
	const { diagnostics } = getDiagnostics("html`<input value=${42}% />`");
	hasNoDiagnostics(diagnostics);
});

it("Don't report mixed event listener binding directly followed by /", () => {
	const { diagnostics } = getDiagnostics("html`<input @input=${console.log}/>`");
	hasNoDiagnostics(diagnostics);
});

it("Report mixed binding with expression and } inside quotes", () => {
	const { diagnostics } = getDiagnostics('html`<input value="${"foo"}}" />`');
	hasDiagnostic(diagnostics, "no-unintended-mixed-binding");
});
