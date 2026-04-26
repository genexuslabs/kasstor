import type {
	ComponentDefinition,
	ComponentDefinitionCssVariable,
	ComponentDefinitionEvent,
	ComponentDefinitionMethod,
	ComponentDefinitionPart,
	ComponentDefinitionProperty,
	ComponentDefinitionSlot
} from "@genexus/kasstor-build";
import type {
	Attribute,
	CemPackage,
	ClassField,
	ClassMember,
	ClassMethod,
	CssCustomProperty,
	CssPart,
	CustomElementDeclaration,
	Event,
	JavaScriptModule,
	Slot
} from "../component-sources/cem-types.js";

interface ConvertOptions {
	/** Used as the CEM `Package` `schemaVersion`. */
	schemaVersion?: string;
}

function propertyToCem(p: ComponentDefinitionProperty): { field: ClassField; attribute?: Attribute } {
	const field: ClassField = {
		kind: "field",
		name: p.name,
		description: p.description,
		type: { text: p.type },
		default: p.default,
		reflects: p.reflect,
		attribute: p.attribute === false ? undefined : p.attribute
	};

	const attribute: Attribute | undefined =
		p.attribute === false
			? undefined
			: {
					name: p.attribute,
					type: { text: p.type },
					default: p.default,
					description: p.description,
					fieldName: p.name
			  };

	return { field, attribute };
}

function methodToCem(m: ComponentDefinitionMethod): ClassMethod {
	return {
		kind: "method",
		name: m.name,
		description: m.description,
		parameters: m.paramTypes.map(p => ({
			name: p.name,
			description: p.description,
			type: { text: p.type }
		})),
		return: { type: { text: m.returnType } }
	};
}

function eventToCem(e: ComponentDefinitionEvent): Event {
	// `bubbles`/`cancelable`/`composed` have no canonical CEM v2.1.0 home; we
	// surface them in the description so they are visible to users on hover.
	const flags: string[] = [];
	if (e.bubbles) flags.push("bubbles");
	if (e.cancelable) flags.push("cancelable");
	if (e.composed) flags.push("composed");
	const description = flags.length > 0 ? `${e.description ?? ""}\n\nFlags: ${flags.join(", ")}`.trim() : e.description;

	return {
		name: e.name,
		description,
		type: { text: e.detailType }
	};
}

function partToCem(p: ComponentDefinitionPart): CssPart {
	return { name: p.name, description: p.description };
}

function slotToCem(s: ComponentDefinitionSlot): Slot {
	return { name: s.name, description: s.description };
}

function cssVarToCem(v: ComponentDefinitionCssVariable): CssCustomProperty {
	return { name: v.name, description: v.description, default: v.default };
}

function componentToCustomElement(c: ComponentDefinition): CustomElementDeclaration {
	const members: ClassMember[] = [];
	const attributes: Attribute[] = [];

	for (const p of c.properties ?? []) {
		const { field, attribute } = propertyToCem(p);
		members.push(field);
		if (attribute) attributes.push(attribute);
	}

	for (const m of c.methods ?? []) {
		members.push(methodToCem(m));
	}

	return {
		kind: "class",
		customElement: true,
		name: c.className,
		tagName: c.tagName,
		description: c.description,
		attributes,
		members,
		events: (c.events ?? []).map(eventToCem),
		slots: (c.slots ?? []).map(slotToCem),
		cssParts: (c.parts ?? []).map(partToCem),
		cssProperties: (c.cssVariables ?? []).map(cssVarToCem)
	};
}

/**
 * Convert a Kasstor library-summary array (the canonical IR produced by
 * `@genexus/kasstor-build`) into a CEM v2.1.0 `Package`.
 *
 * Each component becomes one `javascript-module` entry whose `path` is its
 * relative `srcPath`. This way `coversSourceFile` works naturally if the
 * consumer maps `packageRoot` to the user's project root.
 *
 * Lossy mappings are documented inline:
 *   - `events.bubbles/cancelable/composed` → appended to the event's
 *     `description` (CEM v2.1.0 has no canonical home for these flags).
 *   - `access`, `developmentStatus`, `formAssociated`, `accessibleRole`,
 *     `mode`, `shadow` are dropped: the analyzer does not consume them
 *     today, and CEM has no extension point that downstream tools would
 *     understand. Re-add as a CEM custom field if a real consumer appears.
 */
export function convertKasstorSummaryToCem(summary: readonly ComponentDefinition[], opts: ConvertOptions = {}): CemPackage {
	const modules: JavaScriptModule[] = summary.map(c => ({
		kind: "javascript-module",
		path: c.srcPath,
		declarations: [componentToCustomElement(c)]
	}));

	return {
		schemaVersion: opts.schemaVersion ?? "2.1.0",
		modules
	};
}
