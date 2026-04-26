import { getDiagnostics } from "../helpers/analyze.js";
import { hasDiagnostic, hasNoDiagnostics } from "../helpers/assert.js";
import { it } from "vitest";

it("'no-incompatible-property-type' is not emitted for string types without configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property() color: string;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-incompatible-property-type' is not emitted for string types with String configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({type: String}) color: string;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-incompatible-property-type' is emitted for string types with non-String configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({type: Number}) color: string;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});

it("'no-incompatible-property-type' is emitted for non-string types with no configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property() color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});

it("'no-incompatible-property-type' is emitted for number types with non-Number configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({type: String}) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});

it("'no-incompatible-property-type' is not emitted for number types with Number configuration", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({type: Number}) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-incompatible-property-type' is not emitted for non-string types with attribute: false", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({ attribute: false }) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-incompatible-property-type' is emitted for non-string types with attribute: true", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({ attribute: true }) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});

it("'no-incompatible-property-type' is emitted for non-string types with custom attribute name configured", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({ attribute: 'attribute-name' }) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});

it("'no-incompatible-property-type' is not emitted for non-string types with state: true", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({ state: true }) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasNoDiagnostics(diagnostics);
});

it("'no-incompatible-property-type' is emitted for non-string types with state: false", () => {
	const { diagnostics } = getDiagnostics(
		`
  /**
   * @element
	 */
	class MyElement extends LitElement {
		@property({ state: false }) color: number;
	}
	`,
		{ rules: { "no-incompatible-property-type": "on" } }
	);

	hasDiagnostic(diagnostics, "no-incompatible-property-type");
});
