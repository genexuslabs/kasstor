import { defineConfig } from "vite";
import { defineDistributionConfiguration } from "./vite-config-distribution";

export default defineConfig(({ mode }) =>
  defineDistributionConfiguration(
    mode.startsWith("node"),
    mode.endsWith("production")
  )
);
