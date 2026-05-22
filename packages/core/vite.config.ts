import { kasstor } from "@genexus/vite-plugin-kasstor";
import minifyHTMLLiterals from "@lit-labs/rollup-plugin-minify-html-literals";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "vite";

import { defineDistributionConfiguration } from "../../common/common-vite-config";

const packageJson = await import("./package.json");

export default defineConfig(({ mode }) => {
  const isNode = mode.startsWith("node");
  const isProduction = mode.endsWith("production");
  const isProductionAndBrowser = !isNode && isProduction;

  // Mirror the layout produced by `defineDistributionConfiguration` so that
  // the TypeScript plugin's `outDir` matches Rollup's `build.outDir` (Rollup
  // requires the TS plugin output to live inside its own output directory).
  const envFolder = isProduction ? "production" : "development";
  const nodeOrBrowserFolder = isNode ? "node/" : "browser/";
  const outDir = `dist/${nodeOrBrowserFolder}${envFolder}`;

  const config = defineDistributionConfiguration({
    entry: ["./src/index.ts", "./src/components/theme/theme.lit.ts"],
    isNode,
    isProduction,
    packagePath: "packages/core/",
    peerDependencies: Object.keys(packageJson.peerDependencies)
  });

  config.plugins = [
    // TL;DR: Compile the ts files with this plugin to not downgrade the
    // private fields to WeakMap helpers, so we can reduce the bundle size.
    // Use tsc (TypeScript compiler) instead of esbuild to transform TypeScript
    // files. This preserves native class private fields (#field) even when
    // class-level decorators are present — esbuild unconditionally lowers
    // #fields to WeakMap helpers whenever it sees both a class decorator and
    // private fields, while tsc with target ES2022+ keeps them native.
    // Running this as 'pre' ensures tsc processes .ts files first; by the
    // time Vite's esbuild transform runs, the code is already plain JS (with
    // __decorate calls, no @ syntax), so esbuild never triggers its
    // private-field lowering logic.
    Object.assign(
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
          // Declaration files are generated separately via build.types / tsconfig-types.json
          declaration: false,
          declarationMap: false,
          // Avoid the rollup-plugin-typescript warning when Vite's `sourcemap`
          // flag is off (Rollup refuses to emit ts-plugin source maps unless
          // `output.sourcemap` is set). Rollup itself still produces source
          // maps in production via `build.sourcemap` from common-vite-config.
          sourceMap: false,
          inlineSources: false,
          // The tsconfig's outDir ("dist/") must be a subdirectory of Rollup's
          // output dir — override it to the actual Rollup outDir to satisfy
          // the validator
          outDir
        },
        // Exclude test files from the library build
        exclude: ["src/**/tests/**", "**/*.spec.ts", "**/*.e2e.ts", "**/*.test.ts"]
      }),
      { enforce: "pre" as const }
    ),
    ...((config.plugins as unknown[]) ?? []),
    isProductionAndBrowser &&
      kasstor({
        fileGeneration: {
          exportTypesForTheLibrary: false,
          librarySummary: false,
          typeDeclarationsFolder: false
        }
      }),
    minifyHTMLLiterals()
  ];

  return config;
});
