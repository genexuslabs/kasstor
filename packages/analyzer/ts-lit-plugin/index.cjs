// CJS shim for the TypeScript compiler plugin loader.
//
// `tsserver` resolves a plugin via Node's CJS `require()` and expects the
// module's `module.exports` to be the plugin factory function. The rest of
// this package is ESM (`type: module` in package.json), so we keep this
// single shim file as `.cjs` to satisfy the plugin loader's contract.
//
// Node's CJS loader can `require()` an ESM file as long as the ESM has no
// top-level await — supported since Node 20.13 (`require(esm)`) and the
// default behavior in Node 22.12+. The compiled entry at
// `lib/src/index.js` is plain ESM with named exports, no top-level await.

module.exports = require("./lib/src/index.js").init;
