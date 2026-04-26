import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "kasstor-lit-analyzer",
    environment: "node",
    include: ["test-vitest/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/test-vitest/**/fixtures/**"]
  }
});
