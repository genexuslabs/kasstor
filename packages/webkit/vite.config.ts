import { defineConfig } from "vite";
import { defineDistributionConfiguration } from "../../common/common-vite-config";

export default defineConfig(({ mode }) =>
  defineDistributionConfiguration({
    // Pure re-export barrels are tree-shaken out by Rollup unless they are
    // explicit entries. We list `internationalization/index.ts` here so the
    // `./internationalization.js` subpath export resolves at runtime — its
    // public types and JS shape must stay in sync.
    entry: [
      "./src/index.ts",
      "./src/internationalization/index.ts"
    ],
    isNode: mode.startsWith("node"),
    isProduction: mode.endsWith("production"),
    packagePath: "packages/webkit/",
    peerDependencies: []
  })
);

