import { defineConfig } from "vitest/config";

// Node-only configuration for `@genexus/kasstor-design-system`.
//
// The package's runtime touches `CSSStyleSheet` in `setStyleSheetMapping` /
// `getLoadedStyleSheet` / `get-stylesheet-from-url`, which only exist in a
// browser environment. Those parts are exercised end-to-end by
// `@genexus/kasstor-core`'s browser test suite. Here we only cover the
// surface that is pure data-management (`registerDesignSystem`,
// `getStyleSheetUrl`, the global-registry plumbing) so the validation runs
// in CI as a fast Node test pool without spinning up Chromium.
export default defineConfig({
  test: {
    name: "unit",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules", "**/dist"],
    environment: "node"
  }
});
