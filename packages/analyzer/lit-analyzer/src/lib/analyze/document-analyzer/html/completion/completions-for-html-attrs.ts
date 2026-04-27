import type { SimpleType } from "ts-simple-type";
import { isAssignableToSimpleTypeKind } from "ts-simple-type";
import {
	LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER,
	LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER,
	LIT_HTML_PROP_ATTRIBUTE_MODIFIER
} from "../../../constants.js";
import type { HtmlAttrTarget } from "../../../parse/parse-html-data/html-tag.js";
import { documentationForTarget, isHtmlAttr, isHtmlEvent, isHtmlProp } from "../../../parse/parse-html-data/html-tag.js";
import type { HtmlNode } from "../../../types/html-node/html-node-types.js";
import type { DocumentPositionContext } from "../../../util/get-position-context-in-document.js";
import { lazy } from "../../../util/general-util.js";
import type { LitAnalyzerContext } from "../../../lit-analyzer-context.js";
import type { LitCompletion } from "../../../types/lit-completion.js";

export function completionsForHtmlAttrs(htmlNode: HtmlNode, location: DocumentPositionContext, { htmlStore }: LitAnalyzerContext): LitCompletion[] {
	const onTagName = htmlNode.tagName;

	// All branches below build the completion list with a fused
	// `for-of` + `if-not-used` + `push(targetToCompletion(...))` so the
	// filter/map chain doesn't allocate intermediate iterables. Hot path on
	// every keystroke inside a Lit template.

	// Code completions for ".[...]";
	if (location.word.startsWith(LIT_HTML_PROP_ATTRIBUTE_MODIFIER)) {
		const alreadyUsedPropNames = collectAttrNames(htmlNode, LIT_HTML_PROP_ATTRIBUTE_MODIFIER);
		const out: LitCompletion[] = [];
		for (const prop of htmlStore.getAllPropertiesForTag(htmlNode)) {
			if (alreadyUsedPropNames.has(prop.name)) continue;
			out.push(targetToCompletion(prop, { modifier: LIT_HTML_PROP_ATTRIBUTE_MODIFIER, onTagName }));
		}
		return out;
	}

	// Code completions for "?[...]";
	if (location.word.startsWith(LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER)) {
		const alreadyUsedAttrNames = new Set<string>();
		for (const a of htmlNode.attributes) {
			if (a.modifier === LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER || a.modifier == null) {
				alreadyUsedAttrNames.add(a.name);
			}
		}
		const out: LitCompletion[] = [];
		for (const prop of htmlStore.getAllAttributesForTag(htmlNode)) {
			if (alreadyUsedAttrNames.has(prop.name)) continue;
			if (!isAssignableToBoolean(prop.getType())) continue;
			out.push(targetToCompletion(prop, { modifier: LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER, onTagName }));
		}
		return out;
	}

	// Code completions for "@[...]";
	if (location.word.startsWith(LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER)) {
		const alreadyUsedEventNames = collectAttrNames(htmlNode, LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER);
		const out: LitCompletion[] = [];
		for (const prop of htmlStore.getAllEventsForTag(htmlNode)) {
			if (alreadyUsedEventNames.has(prop.name)) continue;
			out.push(targetToCompletion(prop, { modifier: LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER, onTagName }));
		}
		return out;
	}

	const alreadyUsedAttrNames = collectAttrNames(htmlNode, undefined);
	const out: LitCompletion[] = [];
	for (const prop of htmlStore.getAllAttributesForTag(htmlNode)) {
		if (alreadyUsedAttrNames.has(prop.name)) continue;
		out.push(targetToCompletion(prop, { modifier: "", onTagName }));
	}
	return out;
}

function collectAttrNames(htmlNode: HtmlNode, modifier: string | undefined): Set<string> {
	const out = new Set<string>();
	const attrs = htmlNode.attributes;
	for (let i = 0; i < attrs.length; i++) {
		const a = attrs[i];
		if (modifier === undefined ? a.modifier == null : a.modifier === modifier) {
			out.add(a.name);
		}
	}
	return out;
}

function isAssignableToBoolean(type: SimpleType, { matchAny } = { matchAny: true }): boolean {
	return isAssignableToSimpleTypeKind(type, ["BOOLEAN", "BOOLEAN_LITERAL"], {
		matchAny
	});
}

function targetToCompletion(
	target: HtmlAttrTarget,
	{ modifier, insertModifier, onTagName }: { modifier?: string; insertModifier?: boolean; onTagName?: string }
): LitCompletion {
	if (modifier == null) {
		if (isHtmlAttr(target)) {
			if (isAssignableToBoolean(target.getType(), { matchAny: false })) {
				modifier = LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER;
			} else {
				modifier = "";
			}
		} else if (isHtmlProp(target)) {
			modifier = LIT_HTML_PROP_ATTRIBUTE_MODIFIER;
		} else if (isHtmlEvent(target)) {
			modifier = LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER;
		}
	}

	const isMember = onTagName && target.fromTagName === onTagName;
	const isBuiltIn = target.builtIn;

	return {
		name: `${modifier || ""}${target.name}${"required" in target && target.required ? "!" : ""}`,
		insert: `${insertModifier ? modifier : ""}${target.name}`,
		kind: isBuiltIn ? "enumElement" : isMember ? "member" : "label",
		importance: isBuiltIn ? "low" : isMember ? "high" : "medium",
		documentation: lazy(() => documentationForTarget(target, { modifier }))
	};
}
