import type {
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  Decorator,
  Node,
  ObjectLiteralExpression,
  Program,
  PropertyDeclaration,
  SourceFile,
  TypeChecker,
  Modifier
} from "typescript";
import type * as tsModule from "typescript";
import { toSimpleType } from "ts-simple-type";
import type {
  AnalyzerResult,
  ComponentDeclaration,
  ComponentDefinition,
  ComponentMember,
  ComponentSlot,
  ComponentEvent,
  ComponentCssPart,
  ComponentCssProperty,
  LitElementPropertyConfig,
  VisibilityKind
} from "../../kasstor-analyzer/types.js";

/**
 * Native source-file scanner for Lit / standard custom element patterns.
 * Replaces the runtime call into `web-component-analyzer` so the analyzer
 * keeps working when a project has no library-summary or CEM available —
 * single-file fixtures and ad-hoc components are still discovered without
 * leaning on an external dependency.
 *
 * Recognised patterns:
 *
 *   - `customElements.define("tag-name", ClassRef)`
 *   - `@customElement("tag-name")` decorator on a class
 *   - `interface HTMLElementTagNameMap { "tag": ClassRef }` declarations
 *   - Class members declared with `@property()` / `@state()` decorators,
 *     including the `LitElementPropertyConfig` carried in the call args
 *   - Plain `PropertyDeclaration` fields (kind: "property")
 *   - Visibility from TS modifiers (`public`/`private`/`protected`) and
 *     from the `#` private-name prefix
 *   - JSDoc tags on the class: `@slot`, `@event`/`@fires`, `@csspart`,
 *     `@cssprop`/`@cssproperty`
 *
 * Heritage chain resolution across files is not implemented — clause
 * `declaration` references stay `undefined`. The scanner exists to let
 * single-file fixtures discover their own components; richer cross-file
 * IR is the responsibility of the CEM and library-summary sources.
 */
export class SourceFileComponentScanner {
  constructor(
    private readonly opts: {
      ts: typeof tsModule;
      getProgram: () => Program;
      getChecker: () => TypeChecker;
    }
  ) {}

  scan(sourceFile: SourceFile): AnalyzerResult {
    const ts = this.opts.ts;

    const declarations = new Map<Node, ComponentDeclaration>();
    const tagAssignments: Array<{ tagName: string; tagNode: Node; classRef: Node }> = [];

    const visit = (node: Node): void => {
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        declarations.set(node, this.buildDeclaration(node, sourceFile));
        const tagFromDecorator = this.tagFromCustomElementDecorator(node);
        if (tagFromDecorator != null) {
          tagAssignments.push({ ...tagFromDecorator, classRef: node });
        }
      }

      if (ts.isCallExpression(node)) {
        const fromDefine = this.tagFromCustomElementsDefine(node);
        if (fromDefine != null) tagAssignments.push(fromDefine);
      }

      if (ts.isInterfaceDeclaration(node) && node.name.text === "HTMLElementTagNameMap") {
        this.tagsFromHtmlElementTagNameMap(node, tagAssignments);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const checker = this.opts.getChecker();
    const componentDefinitions: ComponentDefinition[] = [];
    const definitionByTag = new Map<string, ComponentDefinition>();
    const declaredAsComponent = new Set<ComponentDeclaration>();

    for (const a of tagAssignments) {
      const declaration = this.resolveDeclaration(a.classRef, declarations, checker);
      if (declaration != null) declaredAsComponent.add(declaration);

      const existing = definitionByTag.get(a.tagName);
      if (existing != null) {
        existing.tagNameNodes.add(a.tagNode);
        if (existing.declaration == null && declaration != null) {
          existing.declaration = declaration;
          existing.identifierNodes.add(declaration.node);
        }
        continue;
      }

      const definition: ComponentDefinition = {
        sourceFile,
        tagName: a.tagName,
        identifierNodes: new Set(declaration ? [declaration.node] : []),
        tagNameNodes: new Set([a.tagNode]),
        declaration
      };
      definitionByTag.set(a.tagName, definition);
      componentDefinitions.push(definition);
    }

    // Implicit candidacy: classes with @property/@state members or @element
    // JSDoc that aren't explicitly registered still need to flow through the
    // rule pipeline (e.g. property type validation). Synthesize a definition
    // using the kebab-cased class name as the tag.
    for (const [classNode, declaration] of declarations) {
      if (declaredAsComponent.has(declaration)) continue;
      if (!this.isImplicitComponentCandidate(declaration, classNode)) continue;
      const className = this.classIdentifierName(classNode);
      if (className == null) continue;
      const tagName = kebabCase(className);
      if (definitionByTag.has(tagName)) continue;
      const definition: ComponentDefinition = {
        sourceFile,
        tagName,
        identifierNodes: new Set([declaration.node]),
        tagNameNodes: new Set([declaration.node]),
        declaration
      };
      definitionByTag.set(tagName, definition);
      componentDefinitions.push(definition);
    }

    return {
      sourceFile,
      componentDefinitions,
      declarations: Array.from(declarations.values())
    };
  }

  private isImplicitComponentCandidate(
    declaration: ComponentDeclaration,
    classNode: Node
  ): boolean {
    const ts = this.opts.ts;
    if (declaration.members.some(m => m.meta?.node?.decorator != null)) return true;
    const jsDocTags = ts.getJSDocTags(classNode);
    return jsDocTags.some(t => t.tagName.text === "element");
  }

  private classIdentifierName(node: Node): string | undefined {
    const ts = this.opts.ts;
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      return node.name?.text;
    }
    return undefined;
  }

  private resolveDeclaration(
    classRef: Node,
    declarations: Map<Node, ComponentDeclaration>,
    checker: TypeChecker
  ): ComponentDeclaration | undefined {
    if (declarations.has(classRef)) return declarations.get(classRef);
    const symbol = checker.getSymbolAtLocation(classRef);
    if (symbol?.declarations != null) {
      for (const d of symbol.declarations) {
        if (declarations.has(d)) return declarations.get(d);
      }
    }
    return undefined;
  }

  private buildDeclaration(
    node: ClassDeclaration | ClassExpression,
    sourceFile: SourceFile
  ): ComponentDeclaration {
    const ts = this.opts.ts;
    const members: ComponentMember[] = [];
    const slots: ComponentSlot[] = [];
    const events: ComponentEvent[] = [];
    const cssParts: ComponentCssPart[] = [];
    const cssProperties: ComponentCssProperty[] = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        const propMember = this.buildPropertyMembers(member);
        if (propMember != null) members.push(...propMember);
        continue;
      }
      if (ts.isGetAccessorDeclaration(member) && this.isStaticPropertiesAccessor(member)) {
        members.push(...this.membersFromStaticProperties(member));
        continue;
      }
    }

    const jsDocTags = ts.getJSDocTags(node);
    for (const tag of jsDocTags) {
      const tagName = tag.tagName.text;
      const comment = typeof tag.comment === "string" ? tag.comment : "";

      if (tagName === "slot") {
        const m = comment.match(/^\s*-?\s*([^\s-]*)\s*-?\s*(.*)$/);
        const name = m?.[1] ?? "";
        slots.push({ name: name === "-" ? "" : name, jsDoc: { description: m?.[2] } });
      } else if (tagName === "event" || tagName === "fires") {
        const m = comment.match(/^\s*(?:\{([^}]*)\}\s*)?(\S*)\s*-?\s*(.*)$/);
        events.push({
          name: m?.[2] ?? "",
          node,
          jsDoc: { description: m?.[3] },
          typeHint: m?.[1]
        });
      } else if (tagName === "csspart") {
        const m = comment.match(/^\s*(\S+)\s*-?\s*(.*)$/);
        cssParts.push({ name: m?.[1] ?? "", jsDoc: { description: m?.[2] } });
      } else if (tagName === "cssprop" || tagName === "cssproperty") {
        const m = comment.match(/^\s*(--\S+)\s*-?\s*(.*)$/);
        cssProperties.push({ name: m?.[1] ?? "", jsDoc: { description: m?.[2] } });
      }
    }

    return {
      sourceFile,
      node,
      declarationNodes: new Set([node]),
      kind: "class",
      members,
      methods: [],
      events,
      slots,
      cssProperties,
      cssParts,
      heritageClauses: []
    };
  }

  /**
   * `static get properties() { return { foo: { type: String } } }` — the
   * pre-decorator Lit 1 / Polymer property declaration syntax. We translate
   * each entry into the same `ComponentMember` shape that the decorator
   * path produces so downstream rules don't need to special-case it.
   */
  private isStaticPropertiesAccessor(node: import("typescript").GetAccessorDeclaration): boolean {
    const ts = this.opts.ts;
    const modifiers = (ts.getModifiers?.(node) ?? []) as readonly Modifier[];
    if (!modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) return false;
    return ts.isIdentifier(node.name) && node.name.text === "properties";
  }

  private membersFromStaticProperties(
    node: import("typescript").GetAccessorDeclaration
  ): ComponentMember[] {
    const ts = this.opts.ts;
    const result: ComponentMember[] = [];
    const body = node.body;
    if (body == null) return result;
    let returnedObject: ObjectLiteralExpression | undefined;
    for (const stmt of body.statements) {
      if (ts.isReturnStatement(stmt) && stmt.expression && ts.isObjectLiteralExpression(stmt.expression)) {
        returnedObject = stmt.expression;
        break;
      }
    }
    if (returnedObject == null) return result;

    for (const prop of returnedObject.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name) && !ts.isStringLiteralLike(prop.name)) continue;
      const propName = ts.isIdentifier(prop.name) ? prop.name.text : prop.name.text;
      const meta: LitElementPropertyConfig = { node: { decorator: undefined as never } };
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        for (const cfg of prop.initializer.properties) {
          if (!ts.isPropertyAssignment(cfg) || !ts.isIdentifier(cfg.name)) continue;
          const key = cfg.name.text;
          const init = cfg.initializer;
          if (key === "type") {
            meta.type = this.simpleTypeFromTypeConfig(init);
            if (meta.node) meta.node.type = init;
          } else if (key === "attribute") {
            if (init.kind === ts.SyntaxKind.TrueKeyword) meta.attribute = true;
            else if (init.kind === ts.SyntaxKind.FalseKeyword) meta.attribute = false;
            else if (ts.isStringLiteralLike(init)) meta.attribute = init.text;
          } else if (key === "reflect") {
            meta.reflect = init.kind === ts.SyntaxKind.TrueKeyword;
          }
        }
      }
      const attrName = meta.attribute === false
        ? undefined
        : (typeof meta.attribute === "string" ? meta.attribute : propName.toLowerCase());
      const memberNode = prop;
      result.push({
        kind: "property",
        propName,
        attrName,
        node: memberNode,
        type: undefined,
        visibility: "public",
        meta
      });
      if (attrName != null) {
        result.push({
          kind: "attribute",
          attrName,
          node: memberNode,
          type: undefined,
          visibility: "public",
          meta
        });
      }
    }
    return result;
  }

  private buildPropertyMembers(node: PropertyDeclaration): ComponentMember[] | undefined {
    const ts = this.opts.ts;
    const checker = this.opts.getChecker();
    if (!node.name) return undefined;
    const propName = node.name.getText();

    const decorators = (ts.getDecorators?.(node) ?? []) as readonly Decorator[];
    const propertyDecorator = decorators.find(d => this.decoratorName(d) === "property");
    const stateDecorator = decorators.find(
      d => this.decoratorName(d) === "state" || this.decoratorName(d) === "internalProperty"
    );

    const visibility = this.visibilityForMember(node, propName);

    const lazyType = () => {
      const tsType = node.type ? checker.getTypeFromTypeNode(node.type) : checker.getTypeAtLocation(node);
      return toSimpleType(tsType, checker);
    };

    if (stateDecorator != null) {
      const meta = this.metaForDecorator(stateDecorator, "state");
      return [{
        kind: "property",
        propName,
        node,
        type: lazyType,
        visibility: visibility ?? "protected",
        meta
      }];
    }

    if (propertyDecorator == null) {
      return [{
        kind: "property",
        propName,
        node,
        type: lazyType,
        visibility: visibility ?? "public"
      }];
    }

    const meta = this.metaForDecorator(propertyDecorator, "property");
    const attrName = meta.attribute === false
      ? undefined
      : (typeof meta.attribute === "string" ? meta.attribute : propName.toLowerCase());

    const property: ComponentMember = {
      kind: "property",
      propName,
      attrName,
      node,
      type: lazyType,
      visibility: visibility ?? "public",
      meta
    };
    if (attrName == null) return [property];

    const attribute: ComponentMember = {
      kind: "attribute",
      attrName,
      node,
      type: lazyType,
      visibility: visibility ?? "public",
      meta
    };
    return [attribute, property];
  }

  private visibilityForMember(
    node: PropertyDeclaration,
    propName: string
  ): VisibilityKind | undefined {
    const ts = this.opts.ts;
    if (propName.startsWith("#")) return "private";
    const modifiers = (ts.getModifiers?.(node) ?? []) as readonly Modifier[];
    for (const m of modifiers) {
      if (m.kind === ts.SyntaxKind.PrivateKeyword) return "private";
      if (m.kind === ts.SyntaxKind.ProtectedKeyword) return "protected";
      if (m.kind === ts.SyntaxKind.PublicKeyword) return "public";
    }
    return undefined;
  }

  private metaForDecorator(
    decorator: Decorator,
    kind: "property" | "state"
  ): LitElementPropertyConfig {
    const ts = this.opts.ts;
    const expr = decorator.expression;
    if (!ts.isCallExpression(expr)) return {};

    const meta: LitElementPropertyConfig = {
      node: { decorator: expr }
    };

    if (kind === "state") {
      meta.state = true;
    }

    if (expr.arguments.length === 0) return meta;
    const arg = expr.arguments[0];
    if (!ts.isObjectLiteralExpression(arg)) return meta;

    for (const p of (arg as ObjectLiteralExpression).properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
      const key = p.name.text;
      const init = p.initializer;
      if (key === "type") {
        meta.type = this.simpleTypeFromTypeConfig(init);
        if (meta.node) meta.node.type = init;
      } else if (key === "attribute") {
        if (init.kind === ts.SyntaxKind.TrueKeyword) meta.attribute = true;
        else if (init.kind === ts.SyntaxKind.FalseKeyword) meta.attribute = false;
        else if (ts.isStringLiteralLike(init)) meta.attribute = init.text;
        if (meta.node) meta.node.attribute = init;
      } else if (key === "reflect") {
        meta.reflect = init.kind === ts.SyntaxKind.TrueKeyword;
      } else if (key === "state") {
        meta.state = init.kind === ts.SyntaxKind.TrueKeyword;
      } else if (key === "hasConverter") {
        meta.hasConverter = init.kind === ts.SyntaxKind.TrueKeyword;
      } else if (key === "converter") {
        meta.hasConverter = true;
      }
    }

    return meta;
  }

  /**
   * Maps the `type` argument in `@property({type: ...})` to either the
   * matching `SimpleType` (for the five built-in converter hints) or to a
   * raw string when the user passed an identifier we don't recognise. The
   * rule pipeline distinguishes both cases to surface different fixes.
   */
  private simpleTypeFromTypeConfig(init: Node): import("ts-simple-type").SimpleType | string | undefined {
    const ts = this.opts.ts;
    if (!ts.isIdentifier(init)) return undefined;
    switch (init.text) {
      case "String":
        return { kind: "STRING" };
      case "Number":
        return { kind: "NUMBER" };
      case "Boolean":
        return { kind: "BOOLEAN" };
      case "Array":
        return { kind: "ARRAY", type: { kind: "ANY" } };
      case "Object":
        return { kind: "OBJECT", members: [] };
      default:
        return init.text;
    }
  }

  private decoratorName(decorator: Decorator): string | undefined {
    const expr = decorator.expression;
    const ts = this.opts.ts;
    if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
      return expr.expression.text;
    }
    if (ts.isIdentifier(expr)) {
      return expr.text;
    }
    return undefined;
  }

  private tagFromCustomElementDecorator(
    node: ClassDeclaration | ClassExpression
  ): { tagName: string; tagNode: Node } | undefined {
    const ts = this.opts.ts;
    const decorators = (ts.getDecorators?.(node) ?? []) as readonly Decorator[];
    for (const decorator of decorators) {
      if (this.decoratorName(decorator) !== "customElement") continue;
      const expr = decorator.expression;
      if (!ts.isCallExpression(expr) || expr.arguments.length === 0) continue;
      const arg = expr.arguments[0];
      if (ts.isStringLiteralLike(arg)) {
        return { tagName: arg.text, tagNode: arg };
      }
    }
    return undefined;
  }

  private tagFromCustomElementsDefine(
    call: CallExpression
  ): { tagName: string; tagNode: Node; classRef: Node } | undefined {
    const ts = this.opts.ts;
    const expr = call.expression;
    if (
      !ts.isPropertyAccessExpression(expr) ||
      !ts.isIdentifier(expr.expression) ||
      expr.expression.text !== "customElements" ||
      expr.name.text !== "define"
    ) {
      return undefined;
    }
    if (call.arguments.length < 2) return undefined;
    const tagArg = call.arguments[0];
    const classArg = call.arguments[1];
    if (!ts.isStringLiteralLike(tagArg)) return undefined;
    return { tagName: tagArg.text, tagNode: tagArg, classRef: classArg };
  }

  private tagsFromHtmlElementTagNameMap(
    iface: import("typescript").InterfaceDeclaration,
    out: Array<{ tagName: string; tagNode: Node; classRef: Node }>
  ): void {
    const ts = this.opts.ts;
    const members = iface.members;
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!ts.isPropertySignature(member)) continue;
      const nameNode = member.name;
      if (nameNode == null || !ts.isStringLiteralLike(nameNode)) continue;
      if (member.type == null || !ts.isTypeReferenceNode(member.type)) continue;
      const classRef = ts.isIdentifier(member.type.typeName) ? member.type.typeName : undefined;
      if (classRef == null) continue;
      out.push({ tagName: nameNode.text, tagNode: nameNode, classRef });
    }
  }
}

function kebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
