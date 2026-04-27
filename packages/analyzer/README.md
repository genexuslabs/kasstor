# Kasstor Analyzer

Type-checking and IDE integration for [`lit-html`](https://lit.dev/) templates, with first-class support for [Custom Elements Manifest (CEM)](https://github.com/webcomponents/custom-elements-manifest) and the Kasstor library summary.

This subtree contains three packages:

- **`@genexus/kasstor-lit-analyzer`** — the core analyzer + CLI (`kasstor-lit-analyzer`).
- **`@genexus/kasstor-ts-lit-plugin`** — TypeScript Language Service plugin that adds completions, diagnostics and quick fixes inside `lit-html` templates.
- **`kasstor-lit-vscode-plugin`** — VS Code extension that bundles the TS plugin and ships syntaxes for `lit-html`/`css`/`svg` templates.

## Origin

This is a fork-of-fork. The lineage is:

- [`runem/lit-analyzer`](https://github.com/runem/lit-analyzer) — original implementation by **Rune Mehlsen** ([@runemehlsen](https://twitter.com/runemehlsen)) with major contributions from **Andreas Mehlsen** ([@andreasmehlsen](https://twitter.com/andreasmehlsen)) and **Peter Burns** ([@rictic](https://twitter.com/rictic)). Licensed MIT.
- [`JackRobards/lit-analyzer`](https://github.com/JackRobards/lit-analyzer) — maintained fork by **Jack Robards**, ~700 commits ahead of upstream with Dependabot-driven dependency hygiene, TS 5.8 support and Node ≥20. Licensed MIT.
- This subtree — Kasstor's fork-of-fork. New code (manifest ingestion, generics refinement, library-summary adapter) is licensed Apache-2.0; vendored files retain their MIT origin.

All upstream copyright notices are preserved (see `LICENSE.md` per package and `NOTICE` at the root of `packages/analyzer/`).

`web-component-analyzer` (WCA) is **not** a runtime dependency. The kasstor analyzer ingests components from Custom Elements Manifests, the kasstor library-summary, and a small native source-file scanner — all of it kasstor-owned, no external IR libraries.

## What's different vs upstream

1. **Custom Elements Manifest ingestion**: scans `node_modules` for `package.json#customElements` and ingests each manifest. Works for any CEM-shipping package (Shoelace, FAST, etc.).
2. **Kasstor library summary integration**: reads `library-summary.ts` produced by `@genexus/kasstor-build` so Kasstor components are recognized in user templates.
3. **Pluggable component sources**: an `ExternalManifestSource` interface unifies CEM and library-summary ingestion; a native source-file scanner is the local fallback for inline components, gated by config (`analyzeSourceFiles: "auto" | "always" | "never"`).
4. **Renamed scope**: `@genexus/kasstor-*` instead of `@jackolope/*`. CLI bin renamed `lit-analyzer` → `kasstor-lit-analyzer` to avoid collision with global installs.

## Build, test, lint

From the repo root:

```bash
bun analyzer:build           # tsc --build for the 3 packages
bun analyzer:test            # Vitest across all 3 (analyzer + plugin + vscode-extension)
bun analyzer:lint
```

## Configuration

`LitAnalyzerConfig` accepts these new fields:

```ts
{
  // existing: rules, strict, ...
  analyzeSourceFiles: "auto" | "always" | "never",         // default "auto"
  externalManifests: { paths?: string[]; scanNodeModules?: boolean }, // scanNodeModules default true
  kasstorSummary: "auto" | { srcPath: string } | false   // default "auto"
}
```

## License

The vendored code remains under MIT (Copyright © 2018 Rune Mehlsen). New code added in this fork is licensed Apache-2.0 (matching the rest of the Kasstor monorepo). See `NOTICE` for full attribution.
