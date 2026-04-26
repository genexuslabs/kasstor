import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface PackageJsonShape {
  version: string;
}

// ESM-friendly replacement for `require("../package.json")`. We avoid the
// `import ... with { type: "json" }` attribute syntax to stay compatible
// with Node 20 hosts that still gate it behind a flag.
const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8")) as PackageJsonShape;
const { version } = pkg;

const constantsPath = resolve("src/lib/analyze/constants.ts");
const constantsSource = readFileSync(constantsPath, "utf-8");

if (!constantsSource.includes(`"${version}"`)) {
  // eslint-disable-next-line no-console
  console.log(`\nExpected src/lib/analyze/constants.ts to contain the current version "${version}"`);
  process.exit(1);
}
