import type { SimpleType } from "ts-simple-type";
import type { Attribute, ClassField, ClassMember, ClassMethod, CssCustomProperty, CssPart, CustomElementDeclaration, Event, JavaScriptModule, CemPackage, Slot } from "../component-sources/cem-types.js";
import { isCustomElementDeclaration } from "../component-sources/cem-types.js";
import type { HtmlAttr, HtmlCssPart, HtmlCssProperty, HtmlDataCollection, HtmlEvent, HtmlMember, HtmlProp, HtmlSlot, HtmlTag } from "./parse-html-data/html-tag.js";

/**
 * Convert a CEM `type.text` string into a coarse `SimpleType`.
 *
 * CEM only carries the textual type; we cannot resolve it against a TS Program
 * because manifests live outside it. The mapping below covers the common
 * primitives explicitly and falls back to `ANY` for everything else, which is
 * exactly what lit-analyzer treats as "do not enforce binding type" — a safe
 * default that prevents false positives on declarative CEM data.
 */
function cemTypeTextToSimpleType(text: string | undefined): SimpleType {
	if (!text) return { kind: "ANY" } as SimpleType;
	const t = text.trim();
	switch (t) {
		case "string":
		case "String":
			return { kind: "STRING" } as SimpleType;
		case "number":
		case "Number":
			return { kind: "NUMBER" } as SimpleType;
		case "boolean":
		case "Boolean":
			return { kind: "BOOLEAN" } as SimpleType;
		case "null":
			return { kind: "NULL" } as SimpleType;
		case "undefined":
			return { kind: "UNDEFINED" } as SimpleType;
		case "any":
		case "unknown":
			return { kind: "ANY" } as SimpleType;
	}
	// Heuristic: union with simple primitives like "string | undefined"
	if (t.includes("|")) {
		const parts = t.split("|").map(p => p.trim()).filter(Boolean);
		const types = parts.map(p => cemTypeTextToSimpleType(p));
		return { kind: "UNION", types } as SimpleType;
	}
	// Anything else (class names, complex types) treated as ANY for soft binding
	// checks. Future enhancement: expose richer parsing via ts-simple-type.
	return { kind: "ANY", name: t } as SimpleType;
}

interface ConvertOpts {
	sourceName: string;
}

function attributeToHtmlAttr(attr: Attribute, fromTagName: string): HtmlAttr {
	const type = cemTypeTextToSimpleType(attr.type?.text);
	return {
		kind: "attribute",
		name: attr.name,
		fromTagName,
		description: attr.description ?? attr.summary,
		getType: () => type
	};
}

function fieldToHtmlMember(field: ClassField, fromTagName: string): HtmlMember[] {
	const out: HtmlMember[] = [];
	const type = cemTypeTextToSimpleType(field.type?.text);

	// Always emit a property for a public field
	if (field.privacy !== "private" && field.privacy !== "protected") {
		const prop: HtmlProp = {
			kind: "property",
			name: field.name,
			fromTagName,
			description: field.description ?? field.summary,
			getType: () => type
		};
		out.push(prop);

		// Field with linked attribute -> also emit attribute (CEM redundancy: most
		// authors put the attribute in attributes[] AND the field in members[]).
		// We deduplicate by name in the caller.
		if (field.attribute) {
			out.push({
				kind: "attribute",
				name: field.attribute,
				fromTagName,
				description: field.description ?? field.summary,
				getType: () => type
			});
		}
	}

	return out;
}

function eventToHtmlEvent(ev: Event, fromTagName: string): HtmlEvent {
	const type = cemTypeTextToSimpleType(ev.type?.text);
	return {
		name: ev.name,
		fromTagName,
		description: ev.description ?? ev.summary,
		getType: () => type
	};
}

function slotToHtmlSlot(s: Slot, fromTagName: string): HtmlSlot {
	return { name: s.name, fromTagName, description: s.description ?? s.summary };
}

function cssPartToHtmlCssPart(p: CssPart, fromTagName: string): HtmlCssPart {
	return { name: p.name, fromTagName, description: p.description ?? p.summary };
}

function cssPropertyToHtmlCssProperty(p: CssCustomProperty, fromTagName: string): HtmlCssProperty {
	return { name: p.name, fromTagName, description: p.description ?? p.summary, typeHint: p.syntax };
}

function dedupByName<T extends { name?: string }>(items: T[]): T[] {
	const seen = new Map<string, T>();
	for (const item of items) {
		const key = item.name ?? "";
		if (!seen.has(key)) seen.set(key, item);
	}
	return Array.from(seen.values());
}

function convertCustomElementToHtmlTag(decl: CustomElementDeclaration): HtmlTag | undefined {
	if (!decl.tagName) return undefined;
	const fromTagName = decl.tagName;

	const attributes: HtmlAttr[] = [];
	const properties: HtmlProp[] = [];

	for (const a of decl.attributes ?? []) {
		attributes.push(attributeToHtmlAttr(a, fromTagName));
	}

	for (const m of (decl.members ?? []) as ClassMember[]) {
		if (m.kind === "field") {
			for (const out of fieldToHtmlMember(m as ClassField, fromTagName)) {
				if (out.kind === "attribute") attributes.push(out);
				else properties.push(out);
			}
		} else if (m.kind === "method") {
			// Lit-analyzer doesn't track methods; CEM ClassMethod is informational.
			void (m as ClassMethod);
		}
	}

	return {
		tagName: decl.tagName,
		description: decl.description ?? decl.summary,
		attributes: dedupByName(attributes),
		properties: dedupByName(properties),
		events: dedupByName((decl.events ?? []).map(e => eventToHtmlEvent(e, fromTagName))),
		slots: (decl.slots ?? []).map(s => slotToHtmlSlot(s, fromTagName)),
		cssParts: (decl.cssParts ?? []).map(p => cssPartToHtmlCssPart(p, fromTagName)),
		cssProperties: (decl.cssProperties ?? []).map(p => cssPropertyToHtmlCssProperty(p, fromTagName))
	};
}

/**
 * Convert a CEM `Package` into an `HtmlDataCollection` ready to be absorbed by
 * `htmlStore`. Modules without custom elements are silently skipped. Tags
 * without a `tagName` are also skipped (the manifest only describes them as
 * classes, not registered elements).
 */
export function convertCemPackageToHtmlCollection(pkg: CemPackage, _opts: ConvertOpts): HtmlDataCollection {
	const tags: HtmlTag[] = [];

	const modules: JavaScriptModule[] = pkg.modules ?? [];
	for (const mod of modules) {
		for (const decl of mod.declarations ?? []) {
			if (isCustomElementDeclaration(decl)) {
				const tag = convertCustomElementToHtmlTag(decl);
				if (tag) tags.push(tag);
			}
		}
	}

	return {
		tags,
		global: {}
	};
}
