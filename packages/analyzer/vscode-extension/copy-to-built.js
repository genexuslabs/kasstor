const { copy, mkdirp, writeFile } = require("fs-extra");
const { resolve } = require("node:path");

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

// Resolve TypeScript via Node so the path works regardless of where the
// monorepo's `node_modules/typescript` is hoisted (Bun puts hoisted deps at
// the workspace root, three levels up from this package).
const TYPESCRIPT_DIR = resolve(require.resolve("typescript/package.json"), "..");

async function main() {
  // We don't bundle the typescript compiler into ./built/bundle.js, so we
  // need to ship a copy of it inside the extension's node_modules.
  await mkdirp("./built/node_modules/typescript/lib");
  await copy(resolve(TYPESCRIPT_DIR, "package.json"), "./built/node_modules/typescript/package.json");
  await copy(resolve(TYPESCRIPT_DIR, "lib/typescript.js"), "./built/node_modules/typescript/lib/typescript.js");
  await copy(
    resolve(TYPESCRIPT_DIR, "lib/tsserverlibrary.js"),
    "./built/node_modules/typescript/lib/tsserverlibrary.js"
  );

  // For the TS compiler plugin, it must be in node_modules because that's
  // hard coded by the TS compiler's custom module resolution logic.
  await mkdirp("./built/node_modules/@genexus/kasstor-ts-lit-plugin");
  const tsPluginPackageJson = require("../ts-lit-plugin/package.json");
  // We're only using the bundled version, so the plugin doesn't need any
  // dependencies.
  tsPluginPackageJson.dependencies = {};
  await writeFile(
    "./built/node_modules/@genexus/kasstor-ts-lit-plugin/package.json",
    JSON.stringify(tsPluginPackageJson, null, 2)
  );

  // We need to re-export the ts-lit plugin build output from a root index file.
  await writeFile(
    "./built/node_modules/@genexus/kasstor-ts-lit-plugin/index.js",
    `module.exports = require("./lib/index").init;\n`
  );

  // vsce is _very_ picky about the directories in node_modules matching the
  // extension's package.json, so we need an entry for the TS plugin or it
  // will think that it's extraneous.
  const pluginPackageJson = require("./package.json");
  pluginPackageJson.dependencies = pluginPackageJson.dependencies ?? {};
  pluginPackageJson.dependencies["@genexus/kasstor-ts-lit-plugin"] = "*";
  await writeFile("./built/package.json", JSON.stringify(pluginPackageJson, null, 2));

  // Copy static files used by the extension.
  await copy("./LICENSE.md", "./built/LICENSE.md");
  await copy("./README.md", "./built/README.md");
  await copy("./docs", "./built/docs");
  await copy("./syntaxes", "./built/syntaxes");
  await copy("./schemas", "./built/schemas");
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
