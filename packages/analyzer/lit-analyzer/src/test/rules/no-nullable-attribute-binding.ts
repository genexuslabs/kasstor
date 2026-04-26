import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it, expect } from "vitest";

it("'no-nullable-attribute-binding' Cannot assign 'undefined' in attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as number | undefined}" />`', {
		rules: { "no-nullable-attribute-binding": true }
	});
	hasDiagnostic(diagnostics, "no-nullable-attribute-binding");
});

it("'no-nullable-attribute-binding' Can assign 'undefined' in property binding", () => {
	const { diagnostics } = getDiagnostics(
		[makeElement({ slots: ["foo: number | undefined"] }), 'html`<my-element .foo="${{} as number | undefined}"></my-element>`'],
		{ rules: { "no-nullable-attribute-binding": true } }
	);
	hasNoDiagnostics(diagnostics);
});

it("'no-nullable-attribute-binding' Cannot assign 'null' in attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as number | null}" />`', { rules: { "no-nullable-attribute-binding": true } });
	hasDiagnostic(diagnostics, "no-nullable-attribute-binding");
});

it("'no-nullable-attribute-binding' Can assign 'null' in property binding", () => {
	const { diagnostics } = getDiagnostics('html`<input .selectionEnd="${{} as number | null}" />`', {
		rules: { "no-nullable-attribute-binding": true }
	});
	hasNoDiagnostics(diagnostics);
});

it("'no-nullable-attribute-binding' Return type of `ifDefined` is not `null`", () => {
	const { diagnostics } = getDiagnostics(
		`
		const ifDefined = <T>(x: T) => x ?? "non-null";
		html\`<input some-attribute="$\{ifDefined(Math.random() < 0.5 ? 123 : null)}" />\`;
	`,
		{ rules: { "no-nullable-attribute-binding": true } }
	);
	hasNoDiagnostics(diagnostics);
});

it("'no-nullable-attribute-binding' Message for 'null' in attribute detects null type correctly", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as number | null}" />`', { rules: { "no-nullable-attribute-binding": true } });
	hasDiagnostic(diagnostics, "no-nullable-attribute-binding");

	expect(diagnostics[0].message.includes("can end up binding the string 'null'"));
});

it("'no-nullable-attribute-binding' Message for 'undefined' in attribute detects undefined type correctly", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as number | undefined}" />`', {
		rules: { "no-nullable-attribute-binding": true }
	});
	hasDiagnostic(diagnostics, "no-nullable-attribute-binding");

	expect(diagnostics[0].message.includes("can end up binding the string 'undefined'"));
});
