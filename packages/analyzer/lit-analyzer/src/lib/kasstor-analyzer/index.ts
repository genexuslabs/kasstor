/**
 * Kasstor analyzer — single point of contact for component analysis.
 *
 * Every other module in `lit-analyzer` imports the analyzer's runtime
 * functions and types from this barrel. Today the runtime is backed by
 * `web-component-analyzer` (`runem/lit-analyzer` MIT, vendored as the
 * `@jackolope/web-component-analyzer` npm package); the implementation
 * lives outside our codebase, but the contract our rules and stores
 * consume is the local `./types.js` surface.
 *
 * Why a single barrel:
 *
 *   - Source files do not import `@jackolope/web-component-analyzer`
 *     directly — there is exactly one place that does, and it is here.
 *     A future swap to a native Kasstor analyzer is a one-file change
 *     plus a `package.json` dep removal.
 *
 *   - The exported types are vendored verbatim in `./types.ts` so they
 *     can outlive WCA without churn in the rule suite.
 *
 *   - Consumers benefit from kasstor-aware shortcuts here in the future
 *     (e.g. a fast-path for `@Component`-decorated classes) without
 *     forking the rule pipeline.
 *
 * License: the WCA runtime that backs this module is MIT (© 2018 Rune
 * Mehlsen). Vendored types and any new code added here are Apache-2.0.
 * See `packages/analyzer/NOTICE` for the full attribution chain.
 */

// Runtime — sole import of the upstream package in the entire codebase.
export {
  analyzeHTMLElement,
  analyzeSourceFile,
  visitAllHeritageClauses
} from "@jackolope/web-component-analyzer";

// Types — vendored locally so the rules' contract is independent of the
// runtime impl. Whenever the runtime is replaced, the types stay.
export type {
  AnalyzerConfig,
  AnalyzerOptions,
  AnalyzerResult,
  ComponentCssPart,
  ComponentCssProperty,
  ComponentDeclaration,
  ComponentDeclarationKind,
  ComponentDefinition,
  ComponentEvent,
  ComponentFeature,
  ComponentFeatureBase,
  ComponentFeatures,
  ComponentHeritageClause,
  ComponentHeritageClauseKind,
  ComponentMember,
  ComponentMemberAttribute,
  ComponentMemberBase,
  ComponentMemberKind,
  ComponentMemberProperty,
  ComponentMemberReflectKind,
  ComponentMethod,
  ComponentSlot,
  JsDoc,
  JsDocTag,
  JsDocTagParsed,
  LitElementPropertyConfig,
  ModifierKind,
  PriorityKind,
  VisibilityKind
} from "./types.js";

export { ALL_COMPONENT_FEATURES, VERSION } from "./types.js";
