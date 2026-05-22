import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Matches the project layout used by the rest of the workspace
    // (`bun run test:unit` per package). For now we only ship node-side
    // specs that exercise the dev-server hooks programmatically; add a
    // `browser` project here if/when browser-side tests are introduced.
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/**/*.spec.ts"],
          environment: "node",
          // The cache-invalidation spec mutates a fixture on disk; serialize
          // file access so concurrent runs don't fight over the same source.
          fileParallelism: false,
          testTimeout: 20_000
        }
      }
    ]
  }
});
