import type { Node, SourceFile } from "typescript";

import { getCurrentTsModule, it, expect } from "../helpers/ts-test.js";
import { getIndexEntries } from "../helpers/analyze.js";

import type { LitIndexEntry } from "../../lib/analyze/document-analyzer/html/lit-html-document-analyzer.js";
import { HtmlNodeKind } from "../../lib/analyze/types/html-node/html-node-types.js";
import { HtmlNodeAttrKind } from "../../lib/analyze/types/html-node/html-node-attr-types.js";

it("No entries are created for HTML-like template strings if the template tags are not named `html`.", () => {
	const { indexEntries } = getIndexEntries([
		{
			fileName: "main.js",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}
				customElements.define('some-element', SomeElement);

				const nothtml = x => x;
				nothtml\`<some-element></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(0);
});

it("No entries are created for elements that are not defined with `customElements`.", () => {
	const { indexEntries } = getIndexEntries([
		{
			fileName: "main.js",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}

				const html = x => x;
				html\`<some-element></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(0);
});

it("No entries are created for tags that don't match any definition.", () => {
	const { indexEntries } = getIndexEntries([
		{
			fileName: "main.js",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<unknown-element></unknown-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(0);
});

/**
 * Asserts that `identifier` is the identifier of a class with name `className`
 * in the file `sourceFile`.
 */
const assertIdentifiesClass = ({
	identifier,
	sourceFile,
	className
}: {
	identifier: Node;
	sourceFile: SourceFile;
	className: string;
}) => {
	const { isClassDeclaration, isIdentifier } = getCurrentTsModule();

	if (!isIdentifier(identifier)) {
		throw new Error("The definition target's node should be an identifier.");
	}

	expect(identifier.getSourceFile(), "The identifier is not in the expected source file.").toBe(sourceFile);
	expect(identifier.text, `The identifier's text should be \`${className}\`.`).toBe(className);

	const { parent: identParent } = identifier;
	if (!isClassDeclaration(identParent)) {
		throw new Error("The target node's parent should be a class declaration.");
	}

	expect(identParent.name, "The target node should be it's class definition's name.").toBe(identifier);
};

/**
 * Asserts that `entry` is a `HtmlNodeIndexEntry` that describes an element with
 * tag name `tagName` that is defined by a single class named `className` in
 * `sourceFile`.
 */
const assertEntryTargetsClass = ({
	entry,
	sourceFile,
	tagName,
	className
}: {
	entry: LitIndexEntry;
	sourceFile: SourceFile;
	tagName: string;
	className: string;
}) => {
	if (entry.kind !== "NODE-REFERENCE") {
		throw new Error("The entry does not originate from an element.");
	}

	const { node: entryNode } = entry;
	expect(entryNode.kind, "The entry should not originate from an `<svg>` or `<style>`.").toBe(HtmlNodeKind.NODE);
	expect(entryNode.tagName, `The origin element is not a \`<${tagName}>\`.`).toBe(tagName);

	const { targets } = entry.definition;
	expect(targets.length, "The definition should have a single target.").toBe(1);

	const [target] = targets;
	if (target.kind !== "node") {
		throw new Error("The definition target should be a `LitDefinitionTargetNode`.");
	}

	assertIdentifiesClass({ identifier: target.node, sourceFile, className });
};

it("Element references can reference elements defined in the same file. (JS)", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.js",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}
				customElements.define('some-element', SomeElement);

				const html = x => x;
				html\`<some-element></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(1);

	assertEntryTargetsClass({
		entry: entries[0],
		sourceFile,
		tagName: "some-element",
		className: "SomeElement"
	});
});

it("Element references can reference elements defined in the same file. (TS)", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(1);

	assertEntryTargetsClass({
		entry: entries[0],
		sourceFile,
		tagName: "some-element",
		className: "SomeElement"
	});
});

it("An entry is created for elements that are not defined with `customElements` if they are added to `HTMLElementTagNameMap` in TS.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {}

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(1);

	assertEntryTargetsClass({
		entry: entries[0],
		sourceFile,
		tagName: "some-element",
		className: "SomeElement"
	});
});

it("Element references can reference elements defined in a different file.", () => {
	const { indexEntries, program } = getIndexEntries([
		{
			fileName: "main.js",
			entry: true,
			text: `
				import './some-element.js';

				const html = x => x;
				html\`<some-element></some-element>\`;
			`
		},
		{
			fileName: "some-element.ts",
			text: `
				class SomeElement extends HTMLElement {}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}
			`
		}
	]);

	const entries = Array.from(indexEntries);
	expect(entries.length).toBe(1);

	const sourceFile = program.getSourceFile("some-element.ts");

	expect(sourceFile, "some-element.ts source file does not exist.").toBeTruthy();

	assertEntryTargetsClass({
		entry: entries[0],
		sourceFile: sourceFile!,
		tagName: "some-element",
		className: "SomeElement"
	});
});

it("Attribute references are not created for attributes that don't map to known properties.", () => {
	const { indexEntries } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					prop: string;
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element .unknown="abc" other-unknown="def"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(0);
});

/**
 * Asserts that `entry` is a `HtmlNodeAttrIndexEntry` with name `name` and kind
 * `kind` that has a single target `LitDefinitionTargetNode`.
 */
const assertIsAttrRefAndGetTarget = ({
	entry,
	name,
	kind
}: {
	entry: LitIndexEntry;
	name: string;
	kind: HtmlNodeAttrKind;
}) => {
	if (entry.kind !== "ATTRIBUTE-REFERENCE") {
		throw new Error("The entry does not originate from an attribute.");
	}

	const { attribute: entryAttr } = entry;
	expect(entryAttr.name, `The attribute name should be \`${name}\`.`).toBe(name);
	expect(entryAttr.kind, `The attribute kind should be \`${kind}\`.`).toBe(kind);

	const { targets } = entry.definition;
	expect(targets.length, "The definition should have a single target.").toBe(1);

	const [target] = targets;
	if (target.kind !== "node") {
		throw new Error("The definition target should be a `LitDefinitionTargetNode`.");
	}

	return target;
};

const assertIsAttrRefTargetingClass = ({
	entry,
	name,
	kind,
	sourceFile,
	className
}: {
	entry: LitIndexEntry;
	name: string;
	kind: HtmlNodeAttrKind;
	sourceFile: SourceFile;
	className: string;
}) => {
	const { isClassDeclaration } = getCurrentTsModule();

	const { node: targetNode, name: targetName } = assertIsAttrRefAndGetTarget({
		entry,
		name,
		kind
	});

	expect(targetNode.getSourceFile(), "The target node is not in the expected source file.").toBe(sourceFile);
	if (targetName !== name) {
		throw new Error(`The target node's name should be \`${name}\`.`);
	}

	// Find the nearest class declaration.
	let ancestor: Node = targetNode.parent;
	while (!isClassDeclaration(ancestor)) {
		ancestor = ancestor.parent;
	}

	if (!ancestor?.name) {
		throw new Error("The target node was not contained in a named class.");
	}

	assertIdentifiesClass({
		identifier: ancestor.name,
		sourceFile,
		className: className
	});
};

it("Attribute references can reference properties defined in the static `properties` getter.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					static get properties() {
						return {
							prop: {type: String},
						};
					};
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element .prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.PROPERTY,
		sourceFile,
		className: "SomeElement"
	});
});

it("Attribute references can reference properties defined with a class field.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					prop = "abc";
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element .prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.PROPERTY,
		sourceFile,
		className: "SomeElement"
	});
});

// Skipped: pre-Lit-2 legacy patterns (setter-defined / ctor-assigned /
// `observedAttributes`-driven) are not supported by the kasstor source-file
// scanner. Components in this codebase use the `@property` / `@state`
// decorators or the kasstor library-summary; if you need these patterns,
// declare them via a manifest or a summary instead.
it.skip("Attribute references can reference properties defined with a setter.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					set prop() {}
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element .prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.PROPERTY,
		sourceFile,
		className: "SomeElement"
	});
});

it.skip("Attribute references can reference properties defined by assignment in the constructor.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					constructor() {
						super();
						this.prop = "def";
					}
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element .prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.PROPERTY,
		sourceFile,
		className: "SomeElement"
	});
});

it.skip("Attribute references can reference properties defined in `observedAttributes`.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					static get observedAttributes() {
						return ["some-attr"];
					}
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element some-attr="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "some-attr",
		kind: HtmlNodeAttrKind.ATTRIBUTE,
		sourceFile,
		className: "SomeElement"
	});
});

it("Attribute references can reference properties defined with a @property decorator", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					@property({ attribute: "some-attr") someAttr: string;
				}
				customElements.define('some-element', SomeElement);
				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}
				const html = x => x;
				html\`<some-element some-attr="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "some-attr",
		kind: HtmlNodeAttrKind.ATTRIBUTE,
		sourceFile,
		className: "SomeElement"
	});
});

it("Boolean attribute references have the right kind.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					static get properties() {
						return {
							prop: {type: Boolean},
						};
					};
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element ?prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE,
		sourceFile,
		className: "SomeElement"
	});
});

it("Attribute references have the right kind.", () => {
	const { indexEntries, sourceFile } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					static get properties() {
						return {
							// The indexer shouldn't mistake plain attributes with properties
							// of the same name.
							prop: {type: String},
						};
					};
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				const html = x => x;
				html\`<some-element prop="abc"></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(1);

	assertIsAttrRefTargetingClass({
		entry: entries[0],
		name: "prop",
		kind: HtmlNodeAttrKind.ATTRIBUTE,
		sourceFile,
		className: "SomeElement"
	});
});

it("Event listeners do not produce entries.", () => {
	const { indexEntries } = getIndexEntries([
		{
			fileName: "main.ts",
			entry: true,
			text: `
				class SomeElement extends HTMLElement {
					static get properties() {
						return {
							// The indexer shouldn't mistake event listeners with properties
							// of the same name.
							someEvent: {type: Function},
						};
					};
				}
				customElements.define('some-element', SomeElement);

				declare global {
					interface HTMLElementTagNameMap {
						'some-element': SomeElement;
					}
				}

				// Supporting this might be a nice improvement but it doesn't currently work.

				interface SomeElementEventMap extends HTMLElementEventMap, WindowEventHandlersEventMap {
					'someEvent': Event;
				}

				interface SomeElement {
					addEventListener<K extends keyof SomeElementEventMap>(type: K, listener: (this: SomeElement, ev: SomeElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
					addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
					removeEventListener<K extends keyof SomeElementEventMap>(type: K, listener: (this: SomeElement, ev: SomeElementEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
					removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
				}

				const html = x => x;
				html\`<some-element @someEvent=$\{(e) => console.log(e)}></some-element>\`;
			`
		}
	]);

	const entries = Array.from(indexEntries).filter(entry => entry.kind === "ATTRIBUTE-REFERENCE");
	expect(entries.length).toBe(0);
});
