import type {
  ComponentDeclaration,
  ComponentHeritageClause
} from "../../kasstor-analyzer/types.js";

/**
 * Walks every heritage clause reachable from a component declaration,
 * including transitive ones across mixins/extends/implements chains.
 *
 * Mirrors the `visitAllHeritageClauses` helper that previously lived in
 * `web-component-analyzer`; we own it now so the analyzer has no runtime
 * dependency on that package.
 */
export function visitAllHeritageClauses(
  declaration: ComponentDeclaration,
  visit: (clause: ComponentHeritageClause) => void
): void {
  const seen = new Set<ComponentDeclaration>();
  walk(declaration);

  function walk(decl: ComponentDeclaration): void {
    if (seen.has(decl)) return;
    seen.add(decl);

    for (const clause of decl.heritageClauses) {
      visit(clause);
      if (clause.declaration != null) {
        walk(clause.declaration);
      }
    }
  }
}
