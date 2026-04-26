import { expect } from "vitest";
import type { LitAnalyzerRuleId } from "../../lib/analyze/lit-analyzer-config.js";
import type { LitDiagnostic } from "../../lib/analyze/types/lit-diagnostic.js";

/**
 * Assert that exactly one diagnostic was emitted by the rule named
 * `ruleName`. The diagnostics array is dumped to the console when the
 * length does not match so the failure message is useful in CI logs
 * without re-running the test in verbose mode.
 */
export function hasDiagnostic(diagnostics: LitDiagnostic[], ruleName: LitAnalyzerRuleId): void {
  if (diagnostics.length !== 1) {
    prettyLogDiagnostics(diagnostics);
  }
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.source).toBe(ruleName);
}

/** Assert that no diagnostics were emitted. */
export function hasNoDiagnostics(diagnostics: LitDiagnostic[]): void {
  if (diagnostics.length !== 0) {
    prettyLogDiagnostics(diagnostics);
  }
  expect(diagnostics).toHaveLength(0);
}

function prettyLogDiagnostics(diagnostics: LitDiagnostic[]): void {
  // eslint-disable-next-line no-console
  console.log(diagnostics.map(diagnostic => `${diagnostic.source}: ${diagnostic.message}`));
}
