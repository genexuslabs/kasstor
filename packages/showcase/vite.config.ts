import { mercury } from "@genexus/vite-plugin-mercury";
import summary from "rollup-plugin-summary";
import { defineConfig, PluginOption } from "vite";
import { litRefreshPlugin } from "./vite-plugin-lit-refresh";

export default defineConfig({
  esbuild: {
    // drop: ["console", "debugger"], // Removes console and debugger statements
    format: "esm",
    target: "esnext"
  },

  build: {
    minify: "terser", // When downloading the bundles in the browser this compression is better than ESBuild
    target: "esnext" // Necessary to force the ECMA script target version
  },

  plugins: [
    mercury(),

    // Lit Fast Refresh Plugin - captures .lit.ts and .scss file changes
    // and replaces adoptedStyleSheets when SCSS files change
    litRefreshPlugin({
      componentFilePattern: /\.lit\.ts$/,
      scssFilePattern: /\.scss$/
    }),

    // Print bundle summary
    summary({
      // Each bundle
      warnHigh: 120000, // RED >= 120KB
      warnLow: 55000, // GREEN < 55KB,

      // Bundle summary
      totalHigh: 600000, // RED >= 600KB
      totalLow: 250000, // GREEN < 250KB,

      // Different compress methods
      showGzippedSize: true,
      showBrotliSize: true
    })
  ] as PluginOption[]
});

