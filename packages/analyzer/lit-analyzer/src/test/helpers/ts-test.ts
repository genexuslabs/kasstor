import * as tsModule from "typescript";
import { dirname } from "node:path";
import { setTypescriptModule } from "../../lib/analyze/ts-module.js";

// Re-export Vitest's API so historical imports of the form
//   `import { it, ... } from "../helpers/ts-test.js"`
// keep working without a churn-only rewrite of every spec.
export { it, test, describe, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * In the original AVA-based suite, `tsTest` was a wrapper that registered
 * the same test once per supported TypeScript version. The Kasstor fork
 * pins a single TypeScript (the one the rest of the monorepo uses), so
 * the wrapper became a no-op. Vitest's `test` / `it` / `expect` are now
 * imported from `vitest` directly throughout the test suite — this file
 * remains for the helpers that still want to know which TS module is
 * "current" (e.g. fixture compilers).
 */

export function getCurrentTsModule(): typeof tsModule {
  return tsModule;
}

export function getCurrentTsModuleDirectory(): string {
  return dirname(require.resolve("typescript"));
}

/**
 * Registers the active TS module with the analyzer's `tsModule` singleton.
 * Mirrors the side-effect the AVA wrapper performed before each test so
 * any helper that reads the global module sees a consistent value.
 */
export function ensureTsModuleRegistered(): void {
  setTypescriptModule(tsModule);
}
