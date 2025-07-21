import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { resolve } from "path";
import summary from "rollup-plugin-summary";
import { createLogger, UserConfig } from "vite";
import dts from "vite-plugin-dts";

import { updateDevelopmentFlags } from "./update-development-flags";

const packageJson = await import("./package.json");

// Original logger
const logger = createLogger();
const loggerInfo = logger.info;

const RELATIVE_SRC_PATH = "lit-devkit/src/";
const RELATIVE_SRC_PATH_LENGTH = RELATIVE_SRC_PATH.length;

export const defineDistributionConfiguration = (
  isNode: boolean,
  isProduction: boolean
): UserConfig => {
  const envFolder = isProduction ? "production" : "development";
  const nodeOrBrowserFolder = isNode ? "node/" : "browser/";
  const outDir = `dist/${nodeOrBrowserFolder}${envFolder}`;

  return {
    // Custom Logger to avoid duplicating the chunk info
    customLogger: {
      ...logger,
      info(msg, options) {
        // Remove default Vite output for the chunk size
        if (
          msg.includes("dist/") &&
          (msg.includes("kB") || msg.includes("MB"))
        ) {
          return;
        }
        // Otherwise, use the default logger
        loggerInfo(msg, options);
      }
    },

    esbuild: {
      // Only remove console logs in the production environment ("build" command)
      drop: isProduction ? ["console", "debugger"] : [],
      format: "esm",
      target: "esnext"
    },

    build: {
      lib: {
        entry: resolve(__dirname, "./src/index.ts"),
        name: "lit-devkit",
        formats: ["es"],
        fileName: () => `[name].js`
      },
      minify: isProduction ? "terser" : false,

      // We must not empty the outDir, otherwise watch mode won't work at all,
      // because types are not regenerated
      emptyOutDir: false,
      outDir: outDir,
      sourcemap: isProduction,
      target: "esnext",
      assetsInlineLimit: 0,

      terserOptions: {
        ecma: 2024 as never,
        module: true,
        compress: isProduction
          ? {
              unsafe: true,
              // An extra pass can squeeze out an extra byte or two.
              passes: 2
            }
          : false
      },

      rollupOptions: {
        external: [
          ...Object.keys(packageJson.peerDependencies),
          /^tslib/,
          /^lit/
        ],
        output: {
          // Keep file structure
          preserveModules: true,

          // Replace the file structure from src/ to dist/
          entryFileNames: ({ name: fileName }) => {
            const relativePath = fileName.startsWith(RELATIVE_SRC_PATH)
              ? fileName.substring(RELATIVE_SRC_PATH_LENGTH)
              : fileName;
            return `${relativePath}.js`;
          },

          chunkFileNames: ({ name: fileName }) => {
            const relativePath = fileName.startsWith(RELATIVE_SRC_PATH)
              ? fileName.substring(RELATIVE_SRC_PATH_LENGTH)
              : fileName;
            return `${relativePath}.js`;
          }
        }
      }
    },
    plugins: [
      // Update all DEV_MODE and IS_SERVER variable assignment values using
      // their respective environment setting. Terser's dead code removal will
      // then remove any blocks that are conditioned on these variable when
      // false.
      //
      // Code in our <node|browser>/development/ directory looks like this:
      //   if (DEV_MODE) {
      //     dev mode cool stuff
      //   }
      updateDevelopmentFlags(isNode, isProduction),

      isProduction && nodeResolve(),

      // Transpile after minifying the template literals
      typescript({
        tsconfig: "./tsconfig.json",
        outDir
      }),

      dts({
        root: resolve(__dirname, "./"),
        entryRoot: resolve(__dirname, "src"),
        outDir: outDir,
        include: ["src"],
        copyDtsFiles: true,
        insertTypesEntry: false,
        rollupTypes: false,
        tsconfigPath: resolve(__dirname, "./tsconfig.json")
      }),

      // Print bundle summary
      isProduction &&
        !isNode &&
        summary({
          // Each bundle
          warnHigh: 120000, // RED >= 120KB
          warnLow: 40000, // GREEN < 40KB,

          // Bundle summary
          totalHigh: 800000, // RED >= 800KB
          totalLow: 300000, // GREEN < 300KB,

          // Different compress methods
          showGzippedSize: true,
          showBrotliSize: true
        })
    ]
  };
};
