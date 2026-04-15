import { defineConfig } from "vite";
import { defineDistributionConfiguration } from "../../common/common-vite-config";

export default defineConfig(({ mode }) =>
  defineDistributionConfiguration({
    isNode: mode.startsWith("node"),
    isProduction: mode.endsWith("production"),
    packagePath: "packages/webkit/",
    peerDependencies: []
  })
);

