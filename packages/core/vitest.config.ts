import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Tests that don't run on the Browser
        test: {
          name: "unit",

          // Shared tests are included here to run them in Node environment
          include: ["**/*.{test,spec}.ts", "**/*.shared-test.ts"],

          exclude: ["**/node_modules", "**/dist"],

          environment: "node"
        }
      },
      {
        // Tests that runs on the Browser
        test: {
          name: "browser",

          // Shared tests are included here to run them in Browser environment
          include: ["**/*.e2e.ts", "**/*.shared-test.ts"],

          exclude: ["**/node_modules", "**/dist"],

          browser: {
            provider: playwright(),
            // Disable screenshots when the test fails
            screenshotFailures: false,

            enabled: true,

            // It means that no UI will be displayed. Turn this off if you want to
            // see how the UI is tested
            headless: true,

            // At least one instance is required
            instances: [{ browser: "chromium" }]
          }
        }
      }
    ]
  }
});

