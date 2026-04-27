import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { visitAllHeritageClauses } from "../src/lib/analyze/util/heritage.js";
import type { ComponentDeclaration, ComponentHeritageClause } from "../src/lib/kasstor-analyzer/types.js";

/**
 * `visitAllHeritageClauses` replaced the same-named helper from
 * `web-component-analyzer`. The contract callers depend on:
 *   - direct heritage clauses are visited
 *   - clauses on transitive declarations are visited too
 *   - the walker terminates on cyclic declarations (a class that ends up
 *     as its own ancestor through a mixin chain)
 */

function fakeSourceFile(): ts.SourceFile {
  return ts.createSourceFile("/virtual/x.ts", "", ts.ScriptTarget.ESNext);
}

function makeDecl(name: string, clauses: ComponentHeritageClause[] = []): ComponentDeclaration {
  const sf = fakeSourceFile();
  return {
    sourceFile: sf,
    node: sf,
    declarationNodes: new Set(),
    kind: "class",
    members: [],
    methods: [],
    events: [],
    slots: [],
    cssProperties: [],
    cssParts: [],
    heritageClauses: clauses,
    // Marker so tests can assert the right declaration was visited.
    // (Not part of the type but harmless on a structural type.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ name } as any)
  };
}

function clause(decl: ComponentDeclaration, kind: ComponentHeritageClause["kind"] = "extends"): ComponentHeritageClause {
  return { kind, identifier: decl.node, declaration: decl };
}

describe("visitAllHeritageClauses", () => {
  it("walks the immediate heritage clauses", () => {
    const grandparent = makeDecl("Grandparent");
    const parent = makeDecl("Parent", [clause(grandparent)]);
    const child = makeDecl("Child", [clause(parent)]);

    const visited: string[] = [];
    visitAllHeritageClauses(child, c => {
      visited.push((c.declaration as { name?: string } | undefined)?.name ?? "?");
    });
    expect(visited).toEqual(["Parent", "Grandparent"]);
  });

  it("includes mixin and implements clauses", () => {
    const mixinDecl = makeDecl("Mixin");
    const ifaceDecl = makeDecl("IFace");
    const child = makeDecl("Child", [clause(mixinDecl, "mixin"), clause(ifaceDecl, "implements")]);

    const visitedKinds: string[] = [];
    visitAllHeritageClauses(child, c => visitedKinds.push(c.kind));
    expect(visitedKinds).toEqual(expect.arrayContaining(["mixin", "implements"]));
  });

  it("terminates on cyclic heritage chains", () => {
    const a = makeDecl("A");
    const b = makeDecl("B", [clause(a)]);
    // Close the cycle: a extends b, b extends a.
    a.heritageClauses.push(clause(b));

    const visited: string[] = [];
    expect(() =>
      visitAllHeritageClauses(a, c => visited.push((c.declaration as { name?: string }).name ?? "?"))
    ).not.toThrow();
    // Each clause is visited at most once per path; the dedupe set in the
    // walker prevents the infinite recursion.
    expect(visited.length).toBeLessThan(10);
  });

  it("skips clauses with no resolved declaration but still calls the visitor", () => {
    const unresolved: ComponentHeritageClause = {
      kind: "extends",
      identifier: fakeSourceFile(),
      declaration: undefined
    };
    const child = makeDecl("Child", [unresolved]);

    let calls = 0;
    visitAllHeritageClauses(child, () => calls++);
    expect(calls).toBe(1);
  });
});
