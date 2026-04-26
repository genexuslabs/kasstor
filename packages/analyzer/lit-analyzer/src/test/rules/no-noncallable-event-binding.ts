import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("Event binding: Callable value is bindable", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="${() => {}}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Non callback value is not bindable", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="${(():void => {})()}" />`');
	hasDiagnostic(diagnostics, "no-noncallable-event-binding");
});

it("Event binding: Number is not bindable", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="${123}" />`');
	hasDiagnostic(diagnostics, "no-noncallable-event-binding");
});

it("Event binding: Function is bindable", () => {
	const { diagnostics } = getDiagnostics('function foo() {}; html`<input @change="${foo}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Function with property is bindable", () => {
	const { diagnostics } = getDiagnostics('const foo = Object.assign(() => {}, {passive: true}); html`<input @change="${foo}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Called function is not bindable", () => {
	const { diagnostics } = getDiagnostics('function foo() {}; html`<input @change="${foo()}" />`');
	hasDiagnostic(diagnostics, "no-noncallable-event-binding");
});

it("Event binding: Any type is bindable", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="${{} as any}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Object with callable 'handleEvent' is bindable 1", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="${{handleEvent: () => {}}}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Object with callable 'handleEvent' is bindable 2", () => {
	const { diagnostics } = getDiagnostics('function foo() {}; html`<input @change="${{handleEvent: foo}}" />`');
	hasNoDiagnostics(diagnostics);
});

it("Event binding: Object with called 'handleEvent' is not bindable", () => {
	const { diagnostics } = getDiagnostics('function foo() {}; html`<input @change="${{handleEvent: foo()}}" />`');
	hasDiagnostic(diagnostics, "no-noncallable-event-binding");
});

it("Event binding: Object literal without 'handleEvent' is not bindable", () => {
	const { diagnostics } = getDiagnostics('function foo() {}; html`<input @change="${{foo: "bar"}}" />`');
	hasDiagnostic(diagnostics, "no-noncallable-event-binding");
});

it("Event binding: Mixed value binding with first expression being callable is bindable", () => {
	const { diagnostics } = getDiagnostics('html`<input @change="foo${console.log}bar" />`');
	hasNoDiagnostics(diagnostics);
});
