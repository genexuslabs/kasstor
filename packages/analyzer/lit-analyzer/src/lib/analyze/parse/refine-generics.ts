import type { SimpleType, SimpleTypeFunctionParameter } from "ts-simple-type";
import { toSimpleType } from "ts-simple-type";
import type { Node, SourceFile, Symbol as TsSymbol, SymbolFlags, Type, TypeChecker } from "typescript";

/**
 * Internal TypeScript API used to look up `HTMLElementTagNameMap` in scope.
 *
 * `resolveName` is part of the checker's internal API since the early days
 * of the language service and is consumed widely (vue-tsc, svelte-language-tools,
 * etc). It accepts a name, a location, a `SymbolFlags` mask, and an
 * "exclude globals" boolean. We type it via a structural extension because
 * the public `TypeChecker` interface intentionally hides it.
 */
interface ResolvableTypeChecker extends TypeChecker {
  resolveName(
    name: string,
    location: Node | undefined,
    meaning: SymbolFlags,
    excludeGlobals: boolean
  ): TsSymbol | undefined;
}

// `SymbolFlags.Interface = 64`. We hardcode the value so the module can avoid
// a namespace import of `typescript` (the namespace pulls a property bag and
// every access resolves through it). The flags enum is part of the public
// stable API and has not changed across the analyzer's supported TS range.
const SYMBOL_FLAGS_INTERFACE = 64;

interface HtmlMemberLike {
  readonly name: string;
  getType: () => SimpleType;
}

/**
 * Returns the type of a property symbol, evaluated at the symbol's own
 * declaration site. Falls back to `getDeclaredTypeOfSymbol` when the symbol
 * has no declaration (e.g. synthetic symbols).
 */
function typeOfSymbol(checker: TypeChecker, symbol: TsSymbol): Type | undefined {
  const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (decl != null) return checker.getTypeOfSymbolAtLocation(symbol, decl);
  try {
    return checker.getDeclaredTypeOfSymbol(symbol);
  } catch {
    return undefined;
  }
}

/**
 * Substitute every `GENERIC_PARAMETER` in `type` with the corresponding entry
 * in `bindings`. Walks all common composite SimpleType shapes (`UNION`,
 * `INTERSECTION`, `ARRAY`, `PROMISE`, `GENERIC_ARGUMENTS`, `FUNCTION`,
 * `METHOD`). Other shapes are passed through unchanged — substitution failure
 * is non-fatal: the unsubstituted type still compiles, the user just doesn't
 * get the refined error message.
 */
function substituteSimpleType(
  type: SimpleType,
  bindings: ReadonlyMap<string, SimpleType>
): SimpleType {
  switch (type.kind) {
    case "GENERIC_PARAMETER":
      return bindings.get(type.name) ?? type;
    case "UNION":
    case "INTERSECTION": {
      const src = type.types;
      const len = src.length;
      const out = new Array<SimpleType>(len);
      for (let i = 0; i < len; i++) out[i] = substituteSimpleType(src[i]!, bindings);
      return { ...type, types: out };
    }
    case "ARRAY":
      return { ...type, type: substituteSimpleType(type.type, bindings) };
    case "PROMISE":
      return { ...type, type: substituteSimpleType(type.type, bindings) };
    case "GENERIC_ARGUMENTS": {
      const src = type.typeArguments;
      const len = src.length;
      const out = new Array<SimpleType>(len);
      for (let i = 0; i < len; i++) out[i] = substituteSimpleType(src[i]!, bindings);
      return { ...type, target: substituteSimpleType(type.target, bindings), typeArguments: out };
    }
    case "FUNCTION": {
      const params = type.parameters;
      let mapped: SimpleTypeFunctionParameter[] | undefined;
      if (params) {
        const len = params.length;
        mapped = new Array<SimpleTypeFunctionParameter>(len);
        for (let i = 0; i < len; i++) {
          const p = params[i]!;
          mapped[i] = { ...p, type: substituteSimpleType(p.type, bindings) };
        }
      }
      return {
        ...type,
        returnType: type.returnType ? substituteSimpleType(type.returnType, bindings) : undefined,
        parameters: mapped
      };
    }
    case "METHOD": {
      const params = type.parameters;
      const len = params.length;
      const mapped = new Array<SimpleTypeFunctionParameter>(len);
      for (let i = 0; i < len; i++) {
        const p = params[i]!;
        mapped[i] = { ...p, type: substituteSimpleType(p.type, bindings) };
      }
      return {
        ...type,
        returnType: substituteSimpleType(type.returnType, bindings),
        parameters: mapped
      };
    }
    default:
      return type;
  }
}

/**
 * Build the type-parameter → type-argument bindings for a generic instantiation
 * like `MyEl<{ id: number }>`. Returns `undefined` when the type is not a
 * generic instantiation or arity does not match.
 */
function bindingsForElementType(
  elementType: SimpleType
): ReadonlyMap<string, SimpleType> | undefined {
  if (elementType.kind !== "GENERIC_ARGUMENTS") return undefined;
  if (elementType.target.kind !== "CLASS") return undefined;
  const params = elementType.target.typeParameters;
  const args = elementType.typeArguments;
  if (!params) return undefined;
  const len = params.length;
  if (len !== args.length) return undefined;
  const map = new Map<string, SimpleType>();
  for (let i = 0; i < len; i++) {
    map.set(params[i]!.name, args[i]!);
  }
  return map;
}

/**
 * Wrap an `HtmlMember` so its `getType()` returns the generically-substituted
 * type. The original member is mutated in place — wrapping is preferred over
 * replacement to keep references stable for downstream consumers.
 */
function refineMemberType(
  member: HtmlMemberLike,
  checker: TypeChecker,
  elementType: Type,
  bindings: ReadonlyMap<string, SimpleType>
): void {
  const propSymbol = checker.getPropertyOfType(elementType, member.name);
  if (!propSymbol) return;

  const propType = typeOfSymbol(checker, propSymbol);
  if (!propType) return;

  const original = member.getType;
  member.getType = () => {
    const baseSimple = toSimpleType(propType, checker);
    return substituteSimpleType(baseSimple, bindings) ?? original();
  };
}

/**
 * Refine generic property/attribute/event types for every entry in the global
 * `HTMLElementTagNameMap` so that bindings inside `lit-html` templates respect
 * the type arguments declared at the registration site.
 *
 * Closes upstream `runem/lit-analyzer#149` (and tracks the open
 * `runem/lit-analyzer#400` patch). Without this pass, code like:
 *
 *   class GenericElement<T> extends LitElement {
 *     @property() key!: keyof T
 *   }
 *   declare global {
 *     interface HTMLElementTagNameMap {
 *       "generic-specific": GenericElement<{ id: number; name: string }>
 *     }
 *   }
 *   html`<generic-specific key="invalid">`     // <- not flagged, should be
 *
 * is silently accepted because the analyzer sees the property type as
 * `keyof T` (the unbound generic) rather than `"id" | "name"` (the
 * instantiation).
 *
 * Iterates every registered tag and rewrites the matching `HtmlTag`'s
 * `getType()` callbacks to substitute the unbound type parameters with the
 * declared type arguments. Lookups against `htmlStore` after this pass return
 * tags whose properties yield the refined types.
 *
 * Hot-path: this runs once per analyzed source file. The loop body bails
 * before calling `getPropertyOfType` on the (small) common case where a
 * registered tag is not generic, so the steady-state cost is dominated by
 * `getPropertiesOfType` on `HTMLElementTagNameMap`.
 *
 * @param getTag       Lookup for an existing tag by its registered name.
 *                     Returns `undefined` to signal "no such tag" — the pass
 *                     skips the entry without creating new tags.
 * @param sourceFile   File whose scope is used to resolve `HTMLElementTagNameMap`.
 *                     Typically the file currently being analyzed.
 * @param checker      The active `TypeChecker`.
 */
export function refineGenericTagTypesInScope(
  getTag: (tagName: string) => HtmlMemberLike[] | undefined,
  sourceFile: SourceFile,
  checker: TypeChecker
): void;
export function refineGenericTagTypesInScope(
  getTag: (tagName: string) =>
    | { properties: HtmlMemberLike[]; attributes: HtmlMemberLike[]; events: HtmlMemberLike[] }
    | undefined,
  sourceFile: SourceFile,
  checker: TypeChecker
): void;
export function refineGenericTagTypesInScope(
  getTag: (tagName: string) => unknown,
  sourceFile: SourceFile,
  checker: TypeChecker
): void {
  const resolvableChecker = checker as ResolvableTypeChecker;
  if (typeof resolvableChecker.resolveName !== "function") return;

  const mapSymbol = resolvableChecker.resolveName(
    "HTMLElementTagNameMap",
    sourceFile,
    SYMBOL_FLAGS_INTERFACE as SymbolFlags,
    /* excludeGlobals */ false
  );
  if (!mapSymbol) return;

  const mapType = checker.getDeclaredTypeOfSymbol(mapSymbol);
  const mapProperties = checker.getPropertiesOfType(mapType);
  const mapPropsLen = mapProperties.length;

  for (let i = 0; i < mapPropsLen; i++) {
    const tagSymbol = mapProperties[i]!;
    const tagName = tagSymbol.getName();
    const tag = getTag(tagName) as
      | { properties: HtmlMemberLike[]; attributes: HtmlMemberLike[]; events: HtmlMemberLike[] }
      | undefined;
    if (!tag) continue;

    const declaration = tagSymbol.valueDeclaration ?? tagSymbol.declarations?.[0];
    if (!declaration) continue;

    const elementType = checker.getTypeOfSymbolAtLocation(tagSymbol, declaration);
    const elementSimple = toSimpleType(elementType, checker);
    const bindings = bindingsForElementType(elementSimple);
    if (!bindings) continue; // Not a generic instantiation: nothing to refine.

    const properties = tag.properties;
    const propsLen = properties.length;
    for (let j = 0; j < propsLen; j++) {
      refineMemberType(properties[j]!, checker, elementType, bindings);
    }

    const attributes = tag.attributes;
    const attrsLen = attributes.length;
    for (let j = 0; j < attrsLen; j++) {
      refineMemberType(attributes[j]!, checker, elementType, bindings);
    }

    const events = tag.events;
    const eventsLen = events.length;
    for (let j = 0; j < eventsLen; j++) {
      refineMemberType(events[j]!, checker, elementType, bindings);
    }
  }
}
