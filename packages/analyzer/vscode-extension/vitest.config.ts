import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "kasstor-lit-vscode-plugin",
    environment: "node",
    include: ["test-vitest/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/built/**", "**/out/**"],
    testTimeout: 60_000
  }
});
