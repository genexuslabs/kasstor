import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "kasstor-lit-analyzer",
    environment: "node",
    include: [
      // Migrated from AVA — single test tree colocated with the source code.
      // The originals were `.ts` files (compiled to `.js` for the AVA runner);
      // Vitest reads them as TS directly via Vite's transform pipeline.
      "src/test/**/*.ts",
      // Vitest-native suites for component-source modules and end-to-end flows.
      "test-vitest/**/*.test.ts"
    ],
    exclude: [
      "**/node_modules/**",
      "**/snapshots/**",
      "**/test-vitest/**/fixtures/**",
      "**/src/test/helpers/**",
      "**/src/test/fixtures/**"
    ],
    // Snapshots colocated with each spec by default; the migrated tree
    // had its own format under `test/snapshots/results` — we leave that
    // path opt-in so freshly-migrated tests use Vitest's standard layout.
    testTimeout: 60_000
  }
});
