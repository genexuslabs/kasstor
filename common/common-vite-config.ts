import summary from "rollup-plugin-summary";
import { createLogger, Plugin, UserConfig } from "vite";

import { updateDevelopmentFlags } from "./update-development-flags";

// Original logger
const logger = createLogger();
const loggerInfo = logger.info;

const packagePathToPackageName = {
  "packages/core/": "@genexus/kasstor-core",
  "packages/signals/": "@genexus/kasstor-signals",
  "packages/webkit/": "@genexus/kasstor-webkit"
} as const;

export const defineDistributionConfiguration = (options: {
  isNode: boolean;
  isProduction: boolean;
  peerDependencies: string[];
  packagePath: "packages/core/" | "packages/signals/" | "packages/webkit/";
}): UserConfig => {
  const { isNode, isProduction, packagePath, peerDependencies } = options;
  const PACKAGE_PATH_LENGTH = packagePath.length;

  const envFolder = isProduction ? "production" : "development";
  const nodeOrBrowserFolder = isNode ? "node/" : "browser/";
  const outDir = `dist/${nodeOrBrowserFolder}${envFolder}`;
  const isBrowserProduction = isProduction && !isNode;

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
    logLevel: isBrowserProduction ? "silent" : "error",

    esbuild: {
      // Only remove console logs in the production environment ("build" command)
      drop: isProduction ? ["console", "debugger"] : [],
      format: "esm",
      target: "esnext"
    },

    build: {
      lib: {
        entry: "./src/index.ts",
        name: packagePathToPackageName[packagePath],
        formats: ["es"],
        fileName: () => `[name].js`
      },
      minify: isProduction ? "oxc" : false,

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
        external: [/^@genexus/, /^tslib/, /^lit/, ...peerDependencies],
        output: {
          // Keep file structure
          preserveModules: true,

          // Replace the file structure from src/ to dist/
          entryFileNames: ({ name: fileName }) => {
            const relativePath = fileName.startsWith(packagePath)
              ? fileName.substring(PACKAGE_PATH_LENGTH)
              : fileName;
            return `${relativePath}.js`;
          },

          chunkFileNames: ({ name: fileName }) => {
            const relativePath = fileName.startsWith(packagePath)
              ? fileName.substring(PACKAGE_PATH_LENGTH)
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

      // Print bundle summary
      isBrowserProduction &&
        (summary({
          // Each bundle
          warnHigh: 120000, // RED >= 120KB
          warnLow: 40000, // GREEN < 40KB,

          // Bundle summary
          totalHigh: 800000, // RED >= 800KB
          totalLow: 300000, // GREEN < 300KB,

          // Different compress methods
          showGzippedSize: true,
          showBrotliSize: true
        }) as Plugin)
    ]
  };
};

