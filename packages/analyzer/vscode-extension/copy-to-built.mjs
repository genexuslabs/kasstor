import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copy files into the ./built directory.
 *
 * This is the directory that actually has the final filesystem layout for
 * the extension, and to keep the vsix file small we want to only include
 * those files that are needed.
 *
 * Note that ./built/bundle.js is generated directly by esbuild.script.mjs
 * and not copied by this script.
 */

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve TypeScript via Node so the path works regardless of where the
// monorepo's `node_modules/typescript` is hoisted (Bun puts hoisted deps at
// the workspace root, three levels up from this package).
const TYPESCRIPT_DIR = resolve(require.resolve("typescript/package.json"), "..");

function copyFile(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

// We don't bundle the typescript compiler into ./built/bundle.js, so we
// need to ship a copy of it inside the extension's node_modules.
ensureDir(resolve(__dirname, "built/node_modules/typescript/lib"));
copyFile(
  resolve(TYPESCRIPT_DIR, "package.json"),
  resolve(__dirname, "built/node_modules/typescript/package.json")
);
copyFile(
  resolve(TYPESCRIPT_DIR, "lib/typescript.js"),
  resolve(__dirname, "built/node_modules/typescript/lib/typescript.js")
);
copyFile(
  resolve(TYPESCRIPT_DIR, "lib/tsserverlibrary.js"),
  resolve(__dirname, "built/node_modules/typescript/lib/tsserverlibrary.js")
);

// For the TS compiler plugin, it must be in node_modules because that's
// hard coded by the TS compiler's custom module resolution logic.
ensureDir(resolve(__dirname, "built/node_modules/@genexus/kasstor-ts-lit-plugin"));
const tsPluginPackageJson = require("../ts-lit-plugin/package.json");
// We're only using the bundled version, so the plugin doesn't need any
// dependencies.
tsPluginPackageJson.dependencies = {};
writeFileSync(
  resolve(__dirname, "built/node_modules/@genexus/kasstor-ts-lit-plugin/package.json"),
  JSON.stringify(tsPluginPackageJson, null, 2)
);

// We need to re-export the ts-lit plugin build output from a root index file.
writeFileSync(
  resolve(__dirname, "built/node_modules/@genexus/kasstor-ts-lit-plugin/index.js"),
  `module.exports = require("./lib/index").init;\n`
);

// vsce is _very_ picky about the directories in node_modules matching the
// extension's package.json, so we need an entry for the TS plugin or it
// will think that it's extraneous.
const pluginPackageJson = require("./package.json");
pluginPackageJson.dependencies = pluginPackageJson.dependencies ?? {};
pluginPackageJson.dependencies["@genexus/kasstor-ts-lit-plugin"] = "*";
writeFileSync(
  resolve(__dirname, "built/package.json"),
  JSON.stringify(pluginPackageJson, null, 2)
);

// Copy static files used by the extension.
copyFile(resolve(__dirname, "LICENSE.md"), resolve(__dirname, "built/LICENSE.md"));
copyFile(resolve(__dirname, "README.md"), resolve(__dirname, "built/README.md"));
copyFile(resolve(__dirname, "docs"), resolve(__dirname, "built/docs"));
copyFile(resolve(__dirname, "syntaxes"), resolve(__dirname, "built/syntaxes"));
copyFile(resolve(__dirname, "schemas"), resolve(__dirname, "built/schemas"));
