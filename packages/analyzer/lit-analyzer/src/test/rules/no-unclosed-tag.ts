import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Report unclosed tags", () => {
	const { diagnostics } = getDiagnostics("html`<div><div></div>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

it("Don't report void elements", () => {
	const { diagnostics } = getDiagnostics("html`<img>`", { rules: { "no-unclosed-tag": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report void elements with self closing syntax", () => {
	const { diagnostics } = getDiagnostics("html`<img />`", { rules: { "no-unclosed-tag": true } });
	hasNoDiagnostics(diagnostics);
});

// The `<p>` tag will be closed automatically if immediately followed by a lot of other elements,
// including `<div>`.
// Ref: https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
it("Report unclosed 'p' tag that was implicitly closed via tag omission", () => {
	const { diagnostics } = getDiagnostics("html`<p><div></div></p>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

it("Report unclosed 'p' tag that is implicitly closed via tag omission containing text content", () => {
	const { diagnostics } = getDiagnostics("html`<p>Unclosed Content<div></div></p>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

// Regeression test for https://github.com/runem/lit-analyzer/issues/283
it("Report 'p' tag that is implicitly closed via tag omission containing a space", () => {
	// Note, the browser will parse this case into: `<p> </p><div></div><p></p>` which can be
	// unexpected, but technically means the first `<p>` tag is not explicitly closed.
	const { diagnostics } = getDiagnostics("html`<p> <div></div></p>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

// Self-closing tags do not exist in HTML. They are only valid in SVG and MathML.
it("Report non-void element using self closing syntax", () => {
	const { diagnostics } = getDiagnostics("html`<p /><div></div>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

it("Report self closing 'p' tag containing text content", () => {
	const { diagnostics } = getDiagnostics("html`<p />Unclosed Content<div></div>`", { rules: { "no-unclosed-tag": true } });
	hasDiagnostic(diagnostics, "no-unclosed-tag");
});

it("Don't report explicit closing 'p' tag containing text content", () => {
	const { diagnostics } = getDiagnostics("html`<p>Unclosed Content</p><div></div>`", { rules: { "no-unclosed-tag": true } });
	hasNoDiagnostics(diagnostics);
});
