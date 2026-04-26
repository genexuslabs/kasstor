import type { SimpleType } from "ts-simple-type";
import type {
  Attribute,
  ClassField,
  ClassMember,
  CssCustomProperty,
  CssPart,
  CustomElementDeclaration,
  Event,
  JavaScriptModule,
  CemPackage,
  Slot
} from "../component-sources/cem-types.js";
import { isCustomElementDeclaration } from "../component-sources/cem-types.js";
import type {
  HtmlAttr,
  HtmlCssPart,
  HtmlCssProperty,
  HtmlDataCollection,
  HtmlEvent,
  HtmlProp,
  HtmlSlot,
  HtmlTag
} from "./parse-html-data/html-tag.js";

/**
 * Convert a CEM `type.text` string into a coarse `SimpleType`.
 *
 * CEM only carries the textual type; we cannot resolve it against a TS Program
 * because manifests live outside it. The mapping below covers the common
 * primitives explicitly and falls back to `ANY` for everything else, which is
 * exactly what lit-analyzer treats as "do not enforce binding type" — a safe
 * default that prevents false positives on declarative CEM data.
 */
// Singleton SimpleType instances for the primitive cases — every CEM
// attribute/event walks through `cemTypeTextToSimpleType`, so handing back
// shared references avoids ~5 allocations per declaration.
const ST_ANY: SimpleType = { kind: "ANY" } as SimpleType;
const ST_STRING: SimpleType = { kind: "STRING" } as SimpleType;
const ST_NUMBER: SimpleType = { kind: "NUMBER" } as SimpleType;
const ST_BOOLEAN: SimpleType = { kind: "BOOLEAN" } as SimpleType;
const ST_NULL: SimpleType = { kind: "NULL" } as SimpleType;
const ST_UNDEFINED: SimpleType = { kind: "UNDEFINED" } as SimpleType;

function cemTypeTextToSimpleType(text: string | undefined): SimpleType {
  if (!text) return ST_ANY;
  // Cheaper than `String#trim()` for the common already-trimmed case: trim
  // only when leading/trailing whitespace is present.
  const t =
    text.charCodeAt(0) <= 32 || text.charCodeAt(text.length - 1) <= 32 ? text.trim() : text;

  // `switch` on string compiles to a perfect-hash dispatch in V8.
  switch (t) {
    case "string":
    case "String":
      return ST_STRING;
    case "number":
    case "Number":
      return ST_NUMBER;
    case "boolean":
    case "Boolean":
      return ST_BOOLEAN;
    case "null":
      return ST_NULL;
    case "undefined":
      return ST_UNDEFINED;
    case "any":
    case "unknown":
      return ST_ANY;
  }
  // Heuristic: union with simple primitives like "string | undefined".
  // `indexOf` is faster than `includes` and we avoid building intermediate
  // arrays — split + dual loop instead of `.split().map(trim).filter`.
  if (t.indexOf("|") !== -1) {
    const rawParts = t.split("|");
    const partsLen = rawParts.length;
    const types: SimpleType[] = [];
    for (let i = 0; i < partsLen; i++) {
      const p = rawParts[i]!;
      const trimmed =
        p.length === 0 || (p.charCodeAt(0) > 32 && p.charCodeAt(p.length - 1) > 32) ? p : p.trim();
      if (trimmed.length === 0) continue;
      types.push(cemTypeTextToSimpleType(trimmed));
    }
    return { kind: "UNION", types } as SimpleType;
  }
  // Anything else (class names, complex types) treated as ANY for soft
  // binding checks. We DO allocate a new ANY here — keeping the `name`
  // payload distinguishes the type in introspection without reusing the
  // shared `ST_ANY` constant.
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

/**
 * Pushes a property (and possibly an attribute) emitted from a CEM
 * `ClassField` onto the supplied target arrays. Inlined into the caller to
 * eliminate the intermediate `out: HtmlMember[]` allocation that the
 * previous `fieldToHtmlMember` helper produced for every member.
 */
function pushFieldEmissions(
  field: ClassField,
  fromTagName: string,
  attributes: HtmlAttr[],
  properties: HtmlProp[]
): void {
  const privacy = field.privacy;
  if (privacy === "private" || privacy === "protected") return;

  const type = cemTypeTextToSimpleType(field.type?.text);
  const description = field.description ?? field.summary;
  const getType = () => type;

  properties.push({
    kind: "property",
    name: field.name,
    fromTagName,
    description,
    getType
  });

  // Field with linked attribute -> also emit attribute (CEM redundancy: most
  // authors put the attribute in attributes[] AND the field in members[]).
  // We deduplicate by name in the caller.
  if (field.attribute) {
    attributes.push({
      kind: "attribute",
      name: field.attribute,
      fromTagName,
      description,
      getType
    });
  }
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

/**
 * In-place dedup-by-name. Mutates `items` to keep the first occurrence of
 * each `name`. Avoids the temporary `Map` + `Array.from` allocation pair
 * that the previous functional version produced — for tags with ≤8
 * attributes this is consistently faster than a Set/Map round-trip.
 */
function dedupByNameInPlace<T extends { name?: string }>(items: T[]): T[] {
  const len = items.length;
  if (len < 2) return items;

  // Tiny linear-scan dedup — for the typical N≤8 it beats a Map by avoiding
  // hashing entirely. We swap-shrink instead of allocating a new array.
  let write = 0;
  outer: for (let i = 0; i < len; i++) {
    const candidate = items[i]!;
    const candidateName = candidate.name ?? "";
    for (let j = 0; j < write; j++) {
      if ((items[j]!.name ?? "") === candidateName) continue outer;
    }
    if (write !== i) items[write] = candidate;
    write++;
  }
  if (write !== len) items.length = write;
  return items;
}

function convertCustomElementToHtmlTag(decl: CustomElementDeclaration): HtmlTag | undefined {
  const tagName = decl.tagName;
  if (!tagName) return undefined;

  const attributes: HtmlAttr[] = [];
  const properties: HtmlProp[] = [];

  // Plain indexed loops — V8's iterator-protocol implementation for arrays
  // adds ~10% overhead vs an indexed `for`. The hit per CEM is small but
  // multiplied across hundreds of declarations it shows up in profiles.
  const attrs = decl.attributes;
  if (attrs) {
    const n = attrs.length;
    for (let i = 0; i < n; i++) attributes.push(attributeToHtmlAttr(attrs[i]!, tagName));
  }

  const members = decl.members as ClassMember[] | undefined;
  if (members) {
    const n = members.length;
    for (let i = 0; i < n; i++) {
      const m = members[i]!;
      if (m.kind === "field") pushFieldEmissions(m as ClassField, tagName, attributes, properties);
      // CEM `ClassMethod` is informational — lit-analyzer's binding-time
      // type checks only look at properties/attributes.
    }
  }

  const events: HtmlEvent[] = [];
  const evs = decl.events;
  if (evs) {
    const n = evs.length;
    for (let i = 0; i < n; i++) events.push(eventToHtmlEvent(evs[i]!, tagName));
  }

  const slots: HtmlSlot[] = [];
  const ss = decl.slots;
  if (ss) {
    const n = ss.length;
    for (let i = 0; i < n; i++) slots.push(slotToHtmlSlot(ss[i]!, tagName));
  }

  const cssParts: HtmlCssPart[] = [];
  const cps = decl.cssParts;
  if (cps) {
    const n = cps.length;
    for (let i = 0; i < n; i++) cssParts.push(cssPartToHtmlCssPart(cps[i]!, tagName));
  }

  const cssProperties: HtmlCssProperty[] = [];
  const cpps = decl.cssProperties;
  if (cpps) {
    const n = cpps.length;
    for (let i = 0; i < n; i++) cssProperties.push(cssPropertyToHtmlCssProperty(cpps[i]!, tagName));
  }

  return {
    tagName,
    description: decl.description ?? decl.summary,
    attributes: dedupByNameInPlace(attributes),
    properties: dedupByNameInPlace(properties),
    events: dedupByNameInPlace(events),
    slots,
    cssParts,
    cssProperties
  };
}

/**
 * Convert a CEM `Package` into an `HtmlDataCollection` ready to be absorbed by
 * `htmlStore`. Modules without custom elements are silently skipped. Tags
 * without a `tagName` are also skipped (the manifest only describes them as
 * classes, not registered elements).
 */
export function convertCemPackageToHtmlCollection(
  pkg: CemPackage,
  _opts: ConvertOpts
): HtmlDataCollection {
  const tags: HtmlTag[] = [];
  const modules: JavaScriptModule[] = pkg.modules ?? [];
  const modulesLen = modules.length;

  for (let m = 0; m < modulesLen; m++) {
    const decls = modules[m]!.declarations;
    if (!decls) continue;
    const declsLen = decls.length;
    for (let d = 0; d < declsLen; d++) {
      const decl = decls[d]!;
      if (!isCustomElementDeclaration(decl)) continue;
      const tag = convertCustomElementToHtmlTag(decl);
      if (tag !== undefined) tags.push(tag);
    }
  }

  return { tags, global: {} };
}
