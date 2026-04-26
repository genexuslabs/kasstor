import { CssDocument } from "../../../lib/analyze/parse/document/text-document/css-document/css-document.js";
import { VirtualAstCssDocument } from "../../../lib/analyze/parse/document/virtual-document/virtual-css-document.js";
import { findTaggedTemplates } from "../../../lib/analyze/parse/tagged-template/find-tagged-templates.js";

import { compileFiles } from "../../helpers/compile-files.js";
import { it, expect } from "vitest";

function createCssDocument(testFile: string) {
	const { sourceFile } = compileFiles(testFile);
	const taggedTemplates = findTaggedTemplates(sourceFile, ["css"]);
	return new CssDocument(new VirtualAstCssDocument(taggedTemplates[0]));
}

function isTemplateText( text: string, testFile: string) {
	expect(text).toBe(createCssDocument(testFile).virtualDocument.text);
}

it("Substitute for template followed by percent", () => {
	isTemplateText("{ div { transform-origin: 0000% 0000%; } }", "css`{ div { transform-origin: ${x}% ${y}%; } }`");
});

it("Substitute for template last in css list", () => {
	isTemplateText("{ div { border: 2px solid ________; } }", "css`{ div { border: 2px solid ${COLOR}; } }`");
});

it("Substitute for template first in css list", () => {
	isTemplateText("{ div { border: ________ solid #ffffff; } }", "css`{ div { border: ${WIDTH} solid #ffffff; } }`");
});

it("Substitute for template middle in css list", () => {
	isTemplateText("{ div { border: 2px ________ #ffffff; } }", "css`{ div { border: 2px ${STYLE} #ffffff; } }`");
});

it("Substitute for template css key-value pair", () => {
	isTemplateText("{ div { $_:_______________________; } }", "css`{ div { ${unsafeCSS('color: red')}; } }`");
});

it("Substitute for template css value only", () => {
	isTemplateText("{ div { color: ___________________; } }", "css`{ div { color: ${unsafeCSS('red')}; } }`");
});

it("Substitute for template css key only", () => {
	isTemplateText("{ div { $____________________: red; } }", "css`{ div { ${unsafeCSS('color')}: red; } }`");
});
