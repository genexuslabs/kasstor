import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it } from "vitest";

it("Complex types are not assignable using an attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="${{foo: "bar"}}" />`');
	hasDiagnostic(diagnostics, "no-complex-attribute-binding");
});

it("Complex types are assignable using a property binding", () => {
	const { diagnostics } = getDiagnostics('html`<input .onclick="${() => {}}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Primitives are not assignable to complex type using an attribute binding", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["complex = {foo: string}"] }), 'html`<my-element complex="bar"></my-element>`']);
	hasDiagnostic(diagnostics, "no-complex-attribute-binding");
});

it("Complex types are assignable using property binding", () => {
	const { diagnostics } = getDiagnostics([
		makeElement({ properties: ["complex = {foo: string}"] }),
		'html`<my-element .complex="${{foo: "bar"}}"></my-element>`'
	]);
	hasNoDiagnostics(diagnostics);
});

it("Don't check for the assignability of complex types in attribute bindings if the type is a custom lit directive", () => {
	const { diagnostics } = getDiagnostics(
		'type Part = {}; type ifExists = (val: any) => (part: Part) => void; html`<input maxlength="${ifExists(123)}" />`'
	);
	hasNoDiagnostics(diagnostics);
});

it("Ignore element expressions", () => {
	const { diagnostics } = getDiagnostics("html`<input ${{x: 1}} />`", { rules: { "no-incompatible-type-binding": false } });
	hasNoDiagnostics(diagnostics);
});

it("Complex types are assignable to attributes using converters", () => {
	const { diagnostics } = getDiagnostics(
		[
			makeElement({
				properties: [
					`@property({ converter: {
						fromAttribute(str) { return str.split(','); },
						toAttribute(arr) { return arr.join(','); }
					}})
					complex: string[];`
				],
				fullPropertyDeclaration: true
			}),
			'html`<my-element complex="foo,bar"></my-element>`'
		],
		{
			rules: {
				"no-incompatible-type-binding": "off"
			}
		}
	);
	hasNoDiagnostics(diagnostics);
});
