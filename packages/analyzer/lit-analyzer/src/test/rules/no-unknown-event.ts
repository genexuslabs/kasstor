import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Don't report unknown events when 'no-unknown-event' is turned off", () => {
	const { diagnostics } = getDiagnostics("html`<input @foo='${console.log}' />`", { rules: { "no-unknown-event": false } });
	hasNoDiagnostics(diagnostics);
});

it("Report unknown events on known element", () => {
	const { diagnostics } = getDiagnostics("html`<input @foo='${console.log}' />`", { rules: { "no-unknown-event": true } });
	hasDiagnostic(diagnostics, "no-unknown-event");
});

it("Don't report known events", () => {
	const { diagnostics } = getDiagnostics("html`<input @click='${console.log}' />`", { rules: { "no-unknown-event": true } });
	hasNoDiagnostics(diagnostics);
});

it("Don't report unknown events on unknown element", () => {
	const { diagnostics } = getDiagnostics("html`<unknown-element @foo='${console.log}'></unknown-element>`", {
		rules: { "no-unknown-event": true, "no-unknown-tag-name": false }
	});
	hasNoDiagnostics(diagnostics);
});
