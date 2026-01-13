import { defineConfig } from "vite";
import { defineDistributionConfiguration } from "../../common/common-vite-config";

const packageJson = await import("./package.json");

export default defineConfig(({ mode }) =>
  defineDistributionConfiguration({
    isNode: mode.startsWith("node"),
    isProduction: mode.endsWith("production"),
    packagePath: "packages/core/",
    peerDependencies: Object.keys(packageJson.peerDependencies)
  })
);

