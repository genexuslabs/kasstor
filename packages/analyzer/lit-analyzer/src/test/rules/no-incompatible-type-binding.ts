import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it } from "vitest";

const lit2DirectiveSetup = `
	export class Directive { }

	export interface DirectiveClass {
		new (part: PartInfo): Directive;
	}

	export type DirectiveParameters<C extends Directive> = Parameters<C['render']>;

	// TODO (justinfagnani): ts-simple-type has a bug, so I remove the generic
	export interface DirectiveResult {
		values: unknown[];
	}

	export const directive = <C extends DirectiveClass>(c: C) => (...values: DirectiveParameters<InstanceType<C>>): DirectiveResult => ({
    ['_$litDirective$']: c,
    values,
  });
`;

it("Element binding: non-directive not allowed", () => {
	const { diagnostics } = getDiagnostics("html`<input ${123} />`");
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Element binding: lit-html 1 directives are not allowed", () => {
	const { diagnostics } = getDiagnostics(`
export interface Part { }

const ifDefined: (value: unknown) => (part: Part) => void;

html\`<input \${ifDefined(10)} />\`
	`);
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Element binding: Lit 2 directives are allowed", () => {
	const { diagnostics } = getDiagnostics(`

${lit2DirectiveSetup}

class MyDirective extends Directive {
  render(): number {
		return 42;
	}
}
const myDirective = directive(MyDirective);

html\`<input \${myDirective()} />\`
	`);
	hasNoDiagnostics(diagnostics);
});

it("Element binding: any allowed", () => {
	const { diagnostics } = getDiagnostics(`
const ifDefined: any;

html\`<input \${ifDefined(10)} />\`
	`);
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: 'no-incompatible-type-binding' is not emitted when the rule is turned off", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="foo" />`', { rules: { "no-incompatible-type-binding": "off" } });
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (a number) is assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="123" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (not a number) is not assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="foo" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: Number type expression is assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${123}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal type expression (a number) is assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${"123"}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal type expression (not a number) is not assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${"foo"}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: String type expression is not assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as string}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: Expression of type union with two string literals (numbers) is assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as "123" | "321"}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Expression of type union with two string literals (one not being a number) is not assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="${{} as "123" | "foo"}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: String literal is assignable to string", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="foo" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (a number) is assignable to string", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="123" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal expression is assignable to string", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="${"foo"}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Number type expression is assignable to string", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="${123}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (0 length) is assignable to number", () => {
	const { diagnostics } = getDiagnostics('html`<input maxlength="" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (0 length) is assignable to string", () => {
	const { diagnostics } = getDiagnostics('html`<input placeholder="" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal (0 length) is assignable to boolean", () => {
	const { diagnostics } = getDiagnostics('html`<input required="" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: String literal is not assignable to boolean", () => {
	const { diagnostics } = getDiagnostics('html`<input required="foo" />`', { rules: { "no-boolean-in-attribute-binding": false } });
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: Number type expression is not assignable to boolean", () => {
	const { diagnostics } = getDiagnostics('html`<input required="${123}" />`', { rules: { "no-boolean-in-attribute-binding": false } });
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: Boolean attribute is assignable to boolean", () => {
	const { diagnostics } = getDiagnostics("html`<input required />`");
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Boolean type expression is assignable to 'true'|'false'", () => {
	const { diagnostics } = getDiagnostics('let b = true; html`<input aria-expanded="${b}" />`', {
		rules: { "no-boolean-in-attribute-binding": false }
	});
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Boolean type expression (true) is assignable to 'true'|'false'", () => {
	const { diagnostics } = getDiagnostics('html`<input aria-expanded="${true}" />`', { rules: { "no-boolean-in-attribute-binding": false } });
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Boolean type expression (false) is assignable to 'true'|'false'", () => {
	const { diagnostics } = getDiagnostics('html`<input aria-expanded="${false}" />`', { rules: { "no-boolean-in-attribute-binding": false } });
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: Union of 'string | Directive' type expression is assignable to string", () => {
	const { diagnostics } = getDiagnostics('type DirectiveFn = {}; html`<input placeholder="${{} as string | DirectiveFn}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Boolean binding: Empty string literal is not assignable in a boolean attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input ?required="${""}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Boolean binding: Boolean is assignable in a boolean attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input ?required="${true}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Boolean binding: String is not assignable in boolean attribute binding", () => {
	const { diagnostics } = getDiagnostics('html`<input ?required="${{} as string}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Property binding: String literal type expression is not assignable to boolean property", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["required = false"] }), 'html`<my-element .required="${"foo"}"></my-element>`']);
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Property binding: String literal (0 length) type expression is not assignable to boolean property", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["required = false"] }), 'html`<my-element .required="${""}"></my-element>`']);
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Property binding: Number type expression is not assignable to boolean property", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["required = false"] }), 'html`<my-element .required="${123}"></my-element>`']);
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Property binding: Boolean type expression is not assignable to boolean property", () => {
	const { diagnostics } = getDiagnostics([makeElement({ properties: ["required = false"] }), 'html`<my-element .required="${true}"></my-element>`']);
	hasNoDiagnostics(diagnostics);
});

it("Property binding: Type expression correctly reports a type union that is only partially met", () => {
	const { diagnostics } = getDiagnostics([
		makeElement({ properties: ["foo: number = 0"] }),
		'html`<my-element .foo="${"bar" as string | number}"></my-element>`'
	]);
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: 'ifDefined' directive correctly removes 'undefined' from the type union 1", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input maxlength="${ifDefined({} as number | undefined)}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: 'ifDefined' directive correctly removes 'undefined' from the type union 2", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input maxlength="${ifDefined({} as number | string | undefined)}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: 'guard' directive correctly infers correct type from the callback 1", () => {
	const { diagnostics } = getDiagnostics('type guard = Function; html`<img src="${guard([""], () => "nothing.png")}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: 'guard' directive correctly infers correct type from the callback 2", () => {
	const { diagnostics } = getDiagnostics('type guard = Function; html`<input maxlength="${guard([""], () => ({} as string | number))}" />`');
	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: using custom directive won't result in diagnostics", () => {
	const { diagnostics } = getDiagnostics(`
export interface Part { }

const ifDefined: (value: unknown) => (part: Part) => void

const ifExists = (value: any) => ifDefined(value === null ? undefined : value);

html\`<input step="\${ifExists(10)}" />\`
	`);
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: the role attribute is correctly type checked when given valid items", () => {
	const { diagnostics } = getDiagnostics(`html\`<div role="button listitem"></div>\`
	`);

	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: the role attribute is correctly type checked when given invalid items", () => {
	const { diagnostics } = getDiagnostics(`html\`<div role="button foo"></div>\`
	`);

	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

function makeCustomDirective(name = "myDirective") {
	return `
type DirectiveFn<_T = unknown> = (part: Part) => void;
const ${name} = {} as (<T>(arg: T) => DirectiveFn<T>);
`;
}

it("Attribute binding: correctly infers type of generic directive function", () => {
	const { diagnostics } = getDiagnostics(`${makeCustomDirective("myDirective")}
html\`<input step="\${myDirective(10)}" /> \`
	`);

	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: correctly infers type of generic directive function and fails type checking", () => {
	const { diagnostics } = getDiagnostics(`${makeCustomDirective("myDirective")}
html\`<input step="\${myDirective("foo")}" /> \`
	`);

	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: the target attribute is correctly type checked when given a string", () => {
	const { diagnostics } = getDiagnostics(`html\`<a target="custom-target"></a>\`
	`);

	hasNoDiagnostics(diagnostics);
});

it("Strings are assignable to types with converters", () => {
	const { diagnostics } = getDiagnostics([
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
	]);
	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: any symbols are ignored on type checking", () => {
	const { diagnostics } = getDiagnostics(`
declare const value: boolean | unique symbol;
html\`<div aria-expanded=\${userInput}></div>\`
	`);

	hasNoDiagnostics(diagnostics);
});

it("Attribute binding: symbols are not treated as any type", () => {
	const { diagnostics } = getDiagnostics(`
declare const value: "invalid" | unique symbol;
html\`<div aria-expanded=\${value}></div>\`
	`);

	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Attribute binding: lit's nothing is ignored on type checking when returned by a function", () => {
	const { diagnostics } = getDiagnostics(`
declare const nothing: unique symbol;
function customIfDef<T>(value: T | null | undefined): T | typeof nothing {
	return value ?? nothing;
}
declare const value: boolean | null;
html\`<div aria-expanded=\${customIfDef(value)}></div>\`
	`);

	hasNoDiagnostics(diagnostics);
});

// -----------------------------------------------------------------------------
// Kasstor extension: generic component types declared in HTMLElementTagNameMap
// must be substituted at the binding site. Closes upstream
// runem/lit-analyzer#149 (and tracks the open #400 patch).
// -----------------------------------------------------------------------------

it("Generic element in HTMLElementTagNameMap: binding the wrong literal is flagged", () => {
	const { diagnostics } = getDiagnostics(`
		import { LitElement, html, property, customElement } from 'lit-element';

		export class GenericElement<T> extends LitElement {
			@property() key!: keyof T;
		}

		declare global {
			interface HTMLElementTagNameMap {
				'generic-specific': GenericElement<{ id: number; name: string }>;
			}
		}

		html\`<generic-specific key='not-a-key'></generic-specific>\`
	`);

	hasDiagnostic(diagnostics, "no-incompatible-type-binding");
});

it("Generic element in HTMLElementTagNameMap: binding a valid literal type-checks", () => {
	const { diagnostics } = getDiagnostics(`
		import { LitElement, html, property, customElement } from 'lit-element';

		export class GenericElement<T> extends LitElement {
			@property() key!: keyof T;
		}

		declare global {
			interface HTMLElementTagNameMap {
				'generic-specific': GenericElement<{ id: number; name: string }>;
			}
		}

		html\`<generic-specific key='id'></generic-specific>\`
	`);

	hasNoDiagnostics(diagnostics);
});
