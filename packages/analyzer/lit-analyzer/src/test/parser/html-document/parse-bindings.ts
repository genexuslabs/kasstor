import type {
	IHtmlNodeAttrAssignmentMixed,
	IHtmlNodeAttrAssignmentString
} from "../../../lib/analyze/types/html-node/html-node-attr-assignment-types.js";
import { HtmlNodeAttrAssignmentKind } from "../../../lib/analyze/types/html-node/html-node-attr-assignment-types.js";
import { parseHtml } from "../../helpers/parse-html.js";
import { it, expect } from "vitest";

// https://github.com/runem/lit-analyzer/issues/44
it("Correctly parses binding without a missing start quote", () => {
	const res = parseHtml('<button @tap=${console.log}"></button>');
	const attr = res.findAttr(attr => attr.name === "tap")!;
	const assignment = attr.assignment!;

	expect(assignment.kind).toBe(HtmlNodeAttrAssignmentKind.MIXED);
	expect(typeof (assignment as IHtmlNodeAttrAssignmentMixed).values[0]).toBe("object");
	expect((assignment as IHtmlNodeAttrAssignmentMixed).values[1]).toBe('"');
});

it("Parses element binding", () => {
	const res = parseHtml("<input ${ref(testRef)} />");
	const attr = res.findAttr(attr => attr.name.startsWith("_"))!;
	expect(attr.assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION);
});

it("Parses multiple element bindings", () => {
	const res = parseHtml("<input ${x} ${y}/>");
	const input = res.rootNodes[0];
	// Make sure we have two attributes even though the expression
	// length is the same
	expect(input.attributes.length).toBe(2);
});

it("Parses more than 10 element bindings", () => {
	const res = parseHtml("<input ${a} ${b} ${c} ${d} ${e} ${f} ${g} ${h} ${i} ${j} ${k}/>");
	const input = res.rootNodes[0];
	expect(input.attributes.length).toBe(11);
	expect(input.attributes[10].assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION);
});

it("Correctly parses binding with no quotes", () => {
	const res = parseHtml('<input value=${"text"} />');
	const attr = res.findAttr(attr => attr.name === "value")!;
	expect(attr.assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.EXPRESSION);
});

it("Correctly parses binding with no expression and no quotes", () => {
	const res = parseHtml("<input value=text />");
	const attr = res.findAttr(attr => attr.name === "value")!;
	expect(attr.assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.STRING);
	expect((attr.assignment as IHtmlNodeAttrAssignmentString).value).toBe("text");
});

it("Correctly parses binding with single quotes", () => {
	const res = parseHtml("<input value='text' />");
	const attr = res.findAttr(attr => attr.name === "value")!;
	expect(attr.assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.STRING);
});

it("Correctly parses boolean binding", () => {
	const res = parseHtml("<input required />");
	const attr = res.findAttr(attr => attr.name === "required")!;
	expect(attr.assignment!.kind).toBe(HtmlNodeAttrAssignmentKind.BOOLEAN);
});
