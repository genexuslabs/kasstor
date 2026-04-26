// TypeScript Language Service plugin entry.
//
// `tsserver` resolves a plugin via Node's CJS `require()` and expects the
// module's `module.exports` to be the plugin factory function. There is no
// ESM analog for TS plugins — the loader contract is CJS-only by design,
// so this entire package is CJS (`type: commonjs` in package.json).
//
// The TS source code, however, can use ESM syntax — `tsc --module nodenext`
// emits `require()`/`exports.x = ...` to match the package's `commonjs`
// type. Our dependencies are also CJS-loadable (the analyzer itself is
// ESM, and Node's `require(esm)` — stable since 20.13 — bridges the gap).
module.exports = require("./lib/src/index.js").init;
