import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";
import type { TestFile } from "../helpers/compile-files.js";
import { makeElement } from "../helpers/generate-test-file.js";

function makeTestElement({ properties }: { properties?: Array<{ visibility: string; name: string; internal: boolean }> }): TestFile {
	return {
		fileName: "my-element.ts",
		text: `
		class MyElement extends HTMElement {
			${(properties || []).map(({ name, visibility, internal }) => `@${internal ? "state" : "property"}() ${visibility} ${name}: any;`).join("\n")}
		};
		customElements.define("my-element", MyElement);
		`
	};
}

it("Report public @state properties", () => {
	const { diagnostics } = getDiagnostics(
		makeTestElement({
			properties: [{ name: "foo", visibility: "public", internal: true }]
		}),
		{
			rules: { "no-property-visibility-mismatch": true }
		}
	);
	hasDiagnostic(diagnostics, "no-property-visibility-mismatch");
});

it("Report private @property properties", () => {
	const { diagnostics } = getDiagnostics(
		makeTestElement({
			properties: [{ name: "foo", visibility: "private", internal: false }]
		}),
		{
			rules: { "no-property-visibility-mismatch": true }
		}
	);
	hasDiagnostic(diagnostics, "no-property-visibility-mismatch");
});

it("Don't report regular public properties", () => {
	const { diagnostics } = getDiagnostics(
		makeTestElement({
			properties: [{ name: "foo", visibility: "public", internal: false }]
		}),
		{
			rules: { "no-property-visibility-mismatch": true }
		}
	);
	hasNoDiagnostics(diagnostics);
});

it("Don't report private @property properties with `state` true", () => {
	const { diagnostics } = getDiagnostics(
		[
			makeElement({
				properties: [
					`@property({ state: true })
					private foo: string;`
				],
				fullPropertyDeclaration: true
			})
		],
		{
			rules: {
				"no-property-visibility-mismatch": true
			}
		}
	);
	hasNoDiagnostics(diagnostics);
});

it("Don't report @state properties with '#' prefix", () => {
	const { diagnostics } = getDiagnostics(
		makeTestElement({
			properties: [{ name: "#foo", visibility: "", internal: true }]
		}),
		{
			rules: {
				"no-property-visibility-mismatch": true
			}
		}
	);
	hasNoDiagnostics(diagnostics);
});

it("Report @property properties with '#' prefix", () => {
	const { diagnostics } = getDiagnostics(
		makeTestElement({
			properties: [{ name: "#foo", visibility: "", internal: false }]
		}),
		{
			rules: {
				"no-property-visibility-mismatch": true
			}
		}
	);
	hasDiagnostic(diagnostics, "no-property-visibility-mismatch");
});
