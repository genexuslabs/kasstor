import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("'no-missing-element-type-definition' reports diagnostic when element is not in HTMLElementTagNameMap", () => {
	const { diagnostics } = getDiagnostics(
		`
		class MyElement extends HTMLElement { }; 
		customElements.define("my-element", MyElement)
	`,
		{
			rules: { "no-missing-element-type-definition": true }
		}
	);

	hasDiagnostic(diagnostics, "no-missing-element-type-definition");
});

it("'no-missing-element-type-definition' reports no diagnostic when element is in HTMLElementTagNameMap", () => {
	const { diagnostics } = getDiagnostics(
		`
		class MyElement extends HTMLElement { }; 
		customElements.define("my-element", MyElement)
		declare global {
			interface HTMLElementTagNameMap {
				"my-element": MyElement
			}
		}
	`,
		{
			rules: { "no-missing-element-type-definition": true }
		}
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-missing-element-type-definition' reports no diagnostic when element is in HTMLElementTagNameMap using class property", () => {
	const { diagnostics } = getDiagnostics(
		`
		class MyElement extends HTMLElement { 
			static readonly TAG_NAME = "my-element"
		}; 
		customElements.define(MyElement.TAG_NAME, MyElement)
		declare global {
			interface HTMLElementTagNameMap {
				[MyElement.TAG_NAME]: MyElement
			}
		}
	`,
		{
			rules: { "no-missing-element-type-definition": true }
		}
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-missing-element-type-definition' reports no diagnostic when element is in HTMLElementTagNameMap variable", () => {
	const { diagnostics } = getDiagnostics(
		`
		const TAG_NAME = "my-element"
		class MyElement extends HTMLElement { 
		}; 
		customElements.define(MyElement.TAG_NAME, MyElement)
		declare global {
			interface HTMLElementTagNameMap {
				[TAG_NAME]: MyElement
			}
		}
	`,
		{
			rules: { "no-missing-element-type-definition": true }
		}
	);

	hasNoDiagnostics(diagnostics);
});
