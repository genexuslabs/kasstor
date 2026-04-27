import type { TestFile } from "./compile-files.js";

/**
 * Allows you to configure and test options that you would provide to Lit's @property decorator by setting `fullPropertyDeclaration` to true.
 * @link https://lit.dev/docs/api/ReactiveElement/#PropertyDeclaration
 * The relevant options are surfaced on the `.meta` field by the analyzer's
 * native source-file scanner.
 */
export function makeElement({
	properties,
	slots,
	fullPropertyDeclaration
}: {
	properties?: string[];
	slots?: string[];
	fullPropertyDeclaration?: boolean;
}): TestFile {
	let propertiesString: string | undefined;

	if (fullPropertyDeclaration) {
		propertiesString = properties?.join("\n");
	} else {
		propertiesString = properties?.map(prop => `@property() ${prop}`).join("\n");
	}

	return {
		fileName: "my-element.ts",
		text: `
		/**
${(slots || []).map(slot => `        * @slot ${slot}`)}
		 */
		class MyElement extends HTMLElement {
			${propertiesString}
		};
		customElements.define("my-element", MyElement);	
		`
	};
}
