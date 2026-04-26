import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { makeElement } from "../helpers/generate-test-file.js";
import { it } from "vitest";

it("Report unknown slot name", () => {
	const { diagnostics } = getDiagnostics([makeElement({ slots: ["foo"] }), "html`<my-element><div slot='bar'></div></my-element>`"], {
		rules: { "no-unknown-slot": true }
	});
	hasDiagnostic(diagnostics, "no-unknown-slot");
});

it("Don't report known slot name", () => {
	const { diagnostics } = getDiagnostics([makeElement({ slots: ["foo"] }), "html`<my-element><div slot='foo'></div></my-element>`"], {
		rules: { "no-unknown-slot": true }
	});
	hasNoDiagnostics(diagnostics);
});

it("Don't report known, unnamed slot name", () => {
	const { diagnostics } = getDiagnostics([makeElement({ slots: [""] }), "html`<my-element><div slot=''></div></my-element>`"], {
		rules: { "no-unknown-slot": true }
	});
	hasNoDiagnostics(diagnostics);
});

it("Report missing slot attribute", () => {
	const { diagnostics } = getDiagnostics([makeElement({ slots: ["foo"] }), "html`<my-element><div></div></my-element>`"], {
		rules: { "no-unknown-slot": true }
	});
	hasDiagnostic(diagnostics, "no-unknown-slot");
});
