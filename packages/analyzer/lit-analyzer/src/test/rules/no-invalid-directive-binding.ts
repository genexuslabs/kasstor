import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Cannot use 'ifDefined' directive in boolean attribute binding", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input ?maxlength="${ifDefined({} as number | undefined)}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Can use 'ifDefined' directive in attribute binding", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input maxlength="${ifDefined({} as number | undefined)}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Cannot use 'ifDefined' directive in property binding", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input .maxLength="${ifDefined({} as number | undefined)}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Cannot use 'ifDefined' directive in event listener binding", () => {
	const { diagnostics } = getDiagnostics('type ifDefined = Function; html`<input @max="${ifDefined(() => {})}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Cannot use 'live' directive in attribute binding with non-string type", () => {
	const { diagnostics } = getDiagnostics('type live = Function; html`<input value="${live(123)}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Can use 'live' directive in attribute binding with string type", () => {
	const { diagnostics } = getDiagnostics("type live = Function; html`<input value=\"${live('test')}\" />`");
	hasNoDiagnostics(diagnostics);
});

it("Can use 'live' directive in property binding", () => {
	const { diagnostics } = getDiagnostics('type live = Function; html`<input .maxLength="${live(123)}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Can use 'classMap' directive on class attribute", () => {
	const { diagnostics } = getDiagnostics('type classMap = Function; html`<input class="${classMap({foo: true})}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Cannot use 'classMap' directive on non-class attribute", () => {
	const { diagnostics } = getDiagnostics('type classMap = Function; html`<input notclass="${classMap({foo: true})}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Cannot use 'classMap' directive in property binding", () => {
	const { diagnostics } = getDiagnostics('type classMap = Function; html`<input .class="${classMap({foo: true})}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Can use 'styleMap' directive on style attribute", () => {
	const { diagnostics } = getDiagnostics('type styleMap = Function; html`<input style="${styleMap({color: "white"})}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Cannot use 'styleMap' directive on non-style attribute", () => {
	const { diagnostics } = getDiagnostics('type styleMap = Function; html`<input nonstyle="${styleMap({color: "white"})}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Cannot use 'styleMap' directive in property binding", () => {
	const { diagnostics } = getDiagnostics('type classMap = Function; html`<input .style="${styleMap({color: "white"})}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Cannot use 'unsafeHTML' directive in attribute binding", () => {
	const { diagnostics } = getDiagnostics('type unsafeHTML = Function; html`<input maxlength="${unsafeHTML("<h1>Hello</h1>")}" />`');
	hasDiagnostic(diagnostics, "no-invalid-directive-binding");
});

it("Can use 'unsafeHTML' directive text binding", () => {
	const { diagnostics } = getDiagnostics('type unsafeHTML = Function; html`<div>${unsafeHTML("<h1>Hello</h1>")}"</div>`');
	hasNoDiagnostics(diagnostics);
});

it("Can use 'unsafeSVG' directive text binding", () => {
	const { diagnostics } = getDiagnostics('type unsafeSVG = Function; html`<svg>${unsafeSVG("<circle cx="50" cy="50" r="40" fill="red" />")}"</svg>`');
	hasNoDiagnostics(diagnostics);
});

it("Can use 'templateContent' directive text binding", () => {
	const { diagnostics } = getDiagnostics(
		'const templateEl = document.querySelector("template#myContent"); type templateContent = Function; html`<div>${templateContent(templateEl)}"</div>`'
	);
	hasNoDiagnostics(diagnostics);
});
