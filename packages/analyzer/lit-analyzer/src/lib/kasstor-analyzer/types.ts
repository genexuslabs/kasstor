/**
 * Kasstor analyzer — vendored type contract.
 *
 * The types here mirror the public surface that `web-component-analyzer`
 * (WCA) used to expose; the analyzer's rules and converters were typed
 * against them long before this fork existed. We vendor the shapes here so
 * the rest of the codebase keeps a single, stable IR even after WCA itself
 * has been removed as an npm dependency.
 *
 * Origin: types extracted from `web-component-analyzer` v4.0.4 by
 * Rune Mehlsen (MIT, © 2018). The runtime implementation that populates
 * these shapes is provided by `@jackolope/web-component-analyzer`,
 * re-exported through `./index.ts` so source files have a single point of
 * contact for both the values and the types.
 */

import type {
  JSDoc,
  JSDocTag,
  Node,
  Program,
  SourceFile,
  Symbol as TsSymbol,
  Type
} from "typescript";
import type * as tsModule from "typescript";
import type { SimpleType } from "ts-simple-type";

// -----------------------------------------------------------------------------
// Top-level result shapes
// -----------------------------------------------------------------------------

export interface AnalyzerResult {
  sourceFile: SourceFile;
  componentDefinitions: ComponentDefinition[];
  declarations?: ComponentDeclaration[];
  globalFeatures?: ComponentFeatures;
}

export interface ComponentDefinition {
  sourceFile: SourceFile;
  identifierNodes: Set<Node>;
  tagNameNodes: Set<Node>;
  tagName: string;
  declaration?: ComponentDeclaration;
}

export type ComponentDeclarationKind = "mixin" | "interface" | "class";

export type ComponentHeritageClauseKind = "implements" | "extends" | "mixin";

export interface ComponentHeritageClause {
  kind: ComponentHeritageClauseKind;
  identifier: Node;
  declaration: ComponentDeclaration | undefined;
}

export interface ComponentFeatures {
  members: ComponentMember[];
  methods: ComponentMethod[];
  events: ComponentEvent[];
  slots: ComponentSlot[];
  cssProperties: ComponentCssProperty[];
  cssParts: ComponentCssPart[];
}

export interface ComponentDeclaration extends ComponentFeatures {
  sourceFile: SourceFile;
  node: Node;
  declarationNodes: Set<Node>;
  kind: ComponentDeclarationKind;
  jsDoc?: JsDoc;
  symbol?: TsSymbol;
  deprecated?: boolean | string;
  heritageClauses: ComponentHeritageClause[];
}

// -----------------------------------------------------------------------------
// Feature shapes
// -----------------------------------------------------------------------------

export type ComponentFeature = "member" | "method" | "cssproperty" | "csspart" | "event" | "slot";

export const ALL_COMPONENT_FEATURES: ComponentFeature[] = [
  "member",
  "method",
  "cssproperty",
  "csspart",
  "event",
  "slot"
];

export interface ComponentFeatureBase {
  jsDoc?: JsDoc;
  declaration?: ComponentDeclaration;
}

export type VisibilityKind = "public" | "protected" | "private";

export type ModifierKind = "readonly" | "static";

export type PriorityKind = "low" | "medium" | "high";

export type ComponentMemberKind = "property" | "attribute";

export type ComponentMemberReflectKind = "to-attribute" | "to-property" | "both";

export interface ComponentMemberBase extends ComponentFeatureBase {
  kind: ComponentMemberKind;
  node: Node;
  priority?: PriorityKind;
  typeHint?: string;
  type: undefined | (() => Type | SimpleType);
  meta?: LitElementPropertyConfig;
  visibility?: VisibilityKind;
  reflect?: ComponentMemberReflectKind;
  required?: boolean;
  deprecated?: boolean | string;
  default?: unknown;
  modifiers?: Set<ModifierKind>;
}

export interface ComponentMemberProperty extends ComponentMemberBase {
  kind: "property";
  propName: string;
  attrName?: string;
}

export interface ComponentMemberAttribute extends ComponentMemberBase {
  kind: "attribute";
  attrName: string;
  propName?: undefined;
  modifiers?: undefined;
}

export type ComponentMember = ComponentMemberProperty | ComponentMemberAttribute;

export interface ComponentMethod extends ComponentFeatureBase {
  name: string;
  node?: Node;
  type?: () => SimpleType | Type;
  visibility?: VisibilityKind;
}

export interface ComponentEvent extends ComponentFeatureBase {
  name: string;
  node: Node;
  type?: () => SimpleType | Type;
  typeHint?: string;
  visibility?: VisibilityKind;
  deprecated?: boolean | string;
}

export interface ComponentSlot extends ComponentFeatureBase {
  name?: string;
  permittedTagNames?: string[];
}

export interface ComponentCssPart extends ComponentFeatureBase {
  name: string;
}

export interface ComponentCssProperty extends ComponentFeatureBase {
  name: string;
  typeHint?: string;
  default?: unknown;
}

export interface LitElementPropertyConfig {
  type?: SimpleType | string;
  attribute?: string | boolean;
  node?: {
    type?: Node;
    attribute?: Node;
    /**
     * The decorator's call expression — kept as `CallExpression` (not
     * just `Node`) because rules like `no-incompatible-property-type`
     * dereference `.expression` for diagnostics positioning.
     */
    decorator?: import("typescript").CallExpression;
  };
  hasConverter?: boolean;
  default?: unknown;
  reflect?: boolean;
  state?: boolean;
}

// -----------------------------------------------------------------------------
// JSDoc shapes
// -----------------------------------------------------------------------------

export interface JsDocTagParsed {
  tag: string;
  name?: string;
  type?: string;
  optional?: boolean;
  default?: unknown;
  description?: string;
  className?: string;
  namespace?: string;
}

export interface JsDocTag {
  node?: JSDocTag;
  comment?: string;
  tag: string;
  parsed: () => JsDocTagParsed;
}

export interface JsDoc {
  node?: JSDoc;
  description?: string;
  tags?: JsDocTag[];
}

// -----------------------------------------------------------------------------
// Analyzer options & config
// -----------------------------------------------------------------------------

export interface AnalyzerOptions {
  program: Program;
  ts?: typeof tsModule;
  config?: AnalyzerConfig;
  verbose?: boolean;
}

export interface AnalyzerConfig {
  analyzeDefaultLib?: boolean;
  analyzeDependencies?: boolean;
  analyzeGlobalFeatures?: boolean;
  analyzeAllDeclarations?: boolean;
  excludedDeclarationNames?: string[];
  features?: ComponentFeature[];
}

// -----------------------------------------------------------------------------
// Versioning
// -----------------------------------------------------------------------------

export const VERSION = "0.1.0-kasstor";
