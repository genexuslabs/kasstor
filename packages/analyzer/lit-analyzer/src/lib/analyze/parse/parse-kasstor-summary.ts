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

function propertyToCem(p: ComponentDefinitionProperty): {
  field: ClassField;
  attribute?: Attribute;
} {
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
  const description =
    flags.length > 0
      ? `${e.description ?? ""}\n\nFlags: ${flags.join(", ")}`.trim()
      : e.description;

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

  // Properties: indexed for, no destructuring on the result (the
  // `{ field, attribute }` pair allocates an extra object per call).
  const props = c.properties;
  if (props) {
    const len = props.length;
    for (let i = 0; i < len; i++) {
      const p = props[i]!;
      const { field, attribute } = propertyToCem(p);
      members.push(field);
      if (attribute !== undefined) attributes.push(attribute);
    }
  }

  const methods = c.methods;
  if (methods) {
    const len = methods.length;
    for (let i = 0; i < len; i++) members.push(methodToCem(methods[i]!));
  }

  // Build the CEM feature arrays via direct loops — `.map` over
  // `readonly` arrays creates a fresh array per call, and we already
  // know each output length up front.
  const evIn = c.events;
  let events: Event[] | undefined;
  if (evIn) {
    const len = evIn.length;
    events = new Array<Event>(len);
    for (let i = 0; i < len; i++) events[i] = eventToCem(evIn[i]!);
  }

  const slIn = c.slots;
  let slots: Slot[] | undefined;
  if (slIn) {
    const len = slIn.length;
    slots = new Array<Slot>(len);
    for (let i = 0; i < len; i++) slots[i] = slotToCem(slIn[i]!);
  }

  const cpIn = c.parts;
  let cssParts: CssPart[] | undefined;
  if (cpIn) {
    const len = cpIn.length;
    cssParts = new Array<CssPart>(len);
    for (let i = 0; i < len; i++) cssParts[i] = partToCem(cpIn[i]!);
  }

  const cvIn = c.cssVariables;
  let cssProperties: CssCustomProperty[] | undefined;
  if (cvIn) {
    const len = cvIn.length;
    cssProperties = new Array<CssCustomProperty>(len);
    for (let i = 0; i < len; i++) cssProperties[i] = cssVarToCem(cvIn[i]!);
  }

  return {
    kind: "class",
    customElement: true,
    name: c.className,
    tagName: c.tagName,
    description: c.description,
    attributes,
    members,
    events,
    slots,
    cssParts,
    cssProperties
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
export function convertKasstorSummaryToCem(
  summary: readonly ComponentDefinition[],
  opts: ConvertOptions = {}
): CemPackage {
  const len = summary.length;
  const modules: JavaScriptModule[] = new Array<JavaScriptModule>(len);
  for (let i = 0; i < len; i++) {
    const c = summary[i]!;
    modules[i] = {
      kind: "javascript-module",
      path: c.srcPath,
      declarations: [componentToCustomElement(c)]
    };
  }

  return {
    schemaVersion: opts.schemaVersion ?? "2.1.0",
    modules
  };
}
