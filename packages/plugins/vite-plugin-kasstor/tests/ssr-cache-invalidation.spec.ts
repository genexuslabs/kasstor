// Regression tests for the customElements-singleton bug that produces the
// "Hydration value mismatch: Unexpected TemplateResult rendered to part"
// error from `@lit-labs/ssr-client` after editing a Kasstor/Lit component
// under `vite dev` (and equivalently under Astro, which uses Vite for SSR).
//
// Vite already invalidates the SSR module graph(s) on every file change
// internally — `server.environments.*.moduleGraph.onFileChange(file)` is
// invoked by Vite's own watcher handler — so the offending module
// re-executes on the next `ssrLoadModule` call.
//
// What was breaking the dev cycle: `@lit-labs/ssr` installs
// `globalThis.customElements` ONCE per process (`installWindowOnGlobal` in
// `@lit-labs/ssr/lib/dom-shim.js`). Without intervention the re-executed
// module hit `@Component`'s "tag already defined" early-return, the
// registry kept handing back the OLD class, and the SSR'd HTML diverged
// from what the freshly-loaded client tried to hydrate.
//
// The fix lives in `@genexus/kasstor-core`'s `@Component` decorator:
// in `DEV_MODE && IS_SERVER` it evicts the previous registration from the
// dom-shim's registry before `customElements.define` runs again. (See
// `packages/core/src/decorators/Component/index.ts`.)
//
// This spec exercises that contract across a range of realistic dev-cycle
// scenarios: editing a single component, editing only one of many, editing
// several components at once, editing the same component multiple times in
// a row, and editing a non-component file that a component imports.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer, type ViteDevServer } from "vite";

// Import from the built output so the runtime `readFile` calls in
// `src/index.ts` (which expect `*.js` siblings emitted by tsc) resolve.
import { kasstor } from "../dist/index.js";

// ---------------------------------------------------------------------------
// Paths & fixture content factories
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(__dirname, "__fixtures__");

// Single-component fixture (used by the original spec)
const FIXTURE_PATH = resolve(FIXTURES_DIR, "component.ts");
const RENDER_FIXTURE_URL = "/tests/__fixtures__/render.ts";

// Multi-component fixtures
const MULTI_A_PATH = resolve(FIXTURES_DIR, "component-multi-a.ts");
const MULTI_B_PATH = resolve(FIXTURES_DIR, "component-multi-b.ts");
const RENDER_MULTI_URL = "/tests/__fixtures__/render-multi.ts";

// Helper-edit fixtures (component-helper-deps.ts imports helper-marker.ts)
const HELPER_MARKER_PATH = resolve(FIXTURES_DIR, "helper-marker.ts");
const RENDER_HELPER_URL = "/tests/__fixtures__/render-helper.ts";

// Captured at module-load time so each test can restore the on-disk
// placeholder after mutating it. If a process crashes mid-test the file is
// left in V1/V2 state — that's the cost shared by every FS-mutating spec.
const ORIGINALS: Map<string, string> = new Map([
  [FIXTURE_PATH, readFileSync(FIXTURE_PATH, "utf-8")],
  [MULTI_A_PATH, readFileSync(MULTI_A_PATH, "utf-8")],
  [MULTI_B_PATH, readFileSync(MULTI_B_PATH, "utf-8")],
  [HELPER_MARKER_PATH, readFileSync(HELPER_MARKER_PATH, "utf-8")]
]);

/** Generates a component-fixture source with the supplied tag and rendered marker. */
function componentSource(tag: string, marker: string): string {
  return `import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";

@Component({ tag: "${tag}" })
export class FixtureComponent extends KasstorElement {
  override render() {
    return html\`<p>${marker}</p>\`;
  }
}
`;
}

/** Generates the helper-marker source with the supplied `MARKER` constant. */
function helperMarkerSource(marker: string): string {
  return `export const MARKER = "${marker}";
`;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface RenderModule {
  renderApp(): Promise<string>;
}

/**
 * Resolves once the watcher has reported a `change` event for EVERY file in
 * `files`, or after `timeoutMs` — whichever comes first. Chokidar latency
 * varies; the timeout keeps the spec deterministic without racing the
 * subsequent `ssrLoadModule`.
 */
function awaitFileChanges(
  server: ViteDevServer,
  files: string[],
  timeoutMs = 2000
): Promise<void> {
  return new Promise(resolve => {
    const pending = new Set(files);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      server.watcher.off("change", handler);
      resolve();
    };
    const handler = (changed: string) => {
      if (done) return;
      if (pending.delete(changed) && pending.size === 0) {
        finish();
      }
    };
    server.watcher.on("change", handler);
    setTimeout(finish, timeoutMs);
  });
}

/** Boots a fresh Vite server (middleware mode) with the kasstor plugin loaded. */
async function bootViteServer(): Promise<ViteDevServer> {
  return createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    plugins: [await kasstor()],
    server: { middlewareMode: true, hmr: false, watch: { usePolling: false } },
    logLevel: "silent",
    ssr: { noExternal: ["lit", "@lit-labs/ssr"] }
  });
}

async function renderVia(server: ViteDevServer, url: string): Promise<string> {
  const mod = (await server.ssrLoadModule(url)) as RenderModule;
  return mod.renderApp();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vite-plugin-kasstor: SSR module-cache invalidation", () => {
  let server: ViteDevServer | undefined;

  beforeEach(() => {
    // Reset every fixture to the V1 marker each test expects on entry.
    writeFileSync(FIXTURE_PATH, componentSource("cache-test-component", "VERSION_ONE_MARKER"));
    writeFileSync(MULTI_A_PATH, componentSource("multi-test-a", "A_V1"));
    writeFileSync(MULTI_B_PATH, componentSource("multi-test-b", "B_V1"));
    writeFileSync(HELPER_MARKER_PATH, helperMarkerSource("HELPER_V1"));
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
    // Restore every fixture to whatever was on disk when the spec module
    // was first loaded — keeps the working tree clean across runs.
    for (const [path, content] of ORIGINALS) {
      writeFileSync(path, content);
    }
  });

  // -------------------------------------------------------------------------
  // 1) Single-component baseline: confirms the bug is fixed at all.
  // -------------------------------------------------------------------------

  test("a change to a component file is reflected in the next SSR render", async () => {
    server = await bootViteServer();

    const html1 = await renderVia(server, RENDER_FIXTURE_URL);
    expect(html1).toContain("VERSION_ONE_MARKER");
    expect(html1).not.toContain("VERSION_TWO_MARKER");

    const changeNotified = awaitFileChanges(server, [FIXTURE_PATH]);
    writeFileSync(FIXTURE_PATH, componentSource("cache-test-component", "VERSION_TWO_MARKER"));
    await changeNotified;

    const html2 = await renderVia(server, RENDER_FIXTURE_URL);
    expect(
      html2,
      "SSR output is stale — kasstor-core's @Component decorator did not re-register the tag after the SSR module re-executed. Check the `DEV_MODE && IS_SERVER` branch in `packages/core/src/decorators/Component/index.ts`."
    ).toContain("VERSION_TWO_MARKER");
    expect(html2).not.toContain("VERSION_ONE_MARKER");
  });

  // -------------------------------------------------------------------------
  // 2) Selective invalidation: editing one of many components only re-renders
  //    that one. Sibling components retain their previous content (no
  //    accidental re-execution that would, e.g., reset internal state in a
  //    real codebase).
  // -------------------------------------------------------------------------

  test("editing one component among many only changes that component's output; siblings stay the same", async () => {
    server = await bootViteServer();

    const initialHtml = await renderVia(server, RENDER_MULTI_URL);
    expect(initialHtml).toContain("A_V1");
    expect(initialHtml).toContain("B_V1");

    // Mutate ONLY component-multi-a.ts.
    const changeNotified = awaitFileChanges(server, [MULTI_A_PATH]);
    writeFileSync(MULTI_A_PATH, componentSource("multi-test-a", "A_V2"));
    await changeNotified;

    const updatedHtml = await renderVia(server, RENDER_MULTI_URL);
    expect(updatedHtml, "Component A should reflect the edit").toContain("A_V2");
    expect(updatedHtml, "Component B was not edited and must keep V1").toContain("B_V1");
    expect(updatedHtml).not.toContain("A_V1");
    expect(updatedHtml).not.toContain("B_V2");
  });

  // -------------------------------------------------------------------------
  // 3) Concurrent edits: writing to several component files in quick
  //    succession produces a single follow-up render that reflects every
  //    change. Catches races where the second-to-fire watcher event would
  //    otherwise overwrite the first's invalidation.
  // -------------------------------------------------------------------------

  test("simultaneous edits to multiple components are all reflected in the next SSR render", async () => {
    server = await bootViteServer();

    const initialHtml = await renderVia(server, RENDER_MULTI_URL);
    expect(initialHtml).toContain("A_V1");
    expect(initialHtml).toContain("B_V1");

    // Wait for BOTH files to be reported by the watcher before re-rendering.
    const changeNotified = awaitFileChanges(server, [MULTI_A_PATH, MULTI_B_PATH]);
    writeFileSync(MULTI_A_PATH, componentSource("multi-test-a", "A_V2"));
    writeFileSync(MULTI_B_PATH, componentSource("multi-test-b", "B_V2"));
    await changeNotified;

    const updatedHtml = await renderVia(server, RENDER_MULTI_URL);
    expect(updatedHtml).toContain("A_V2");
    expect(updatedHtml).toContain("B_V2");
    expect(updatedHtml).not.toContain("A_V1");
    expect(updatedHtml).not.toContain("B_V1");
  });

  // -------------------------------------------------------------------------
  // 4) Successive edits: V1 → V2 → V3 to the same component, each rendered in
  //    turn. Verifies the re-registration path is idempotent across many
  //    iterations of the dev cycle (and that the dom-shim's reverse map
  //    accumulating stale entries doesn't trip the next `define` call).
  // -------------------------------------------------------------------------

  test("successive edits to the same component (V1 → V2 → V3) are each reflected", async () => {
    server = await bootViteServer();

    const html1 = await renderVia(server, RENDER_FIXTURE_URL);
    expect(html1).toContain("VERSION_ONE_MARKER");

    const versions = ["VERSION_TWO_MARKER", "VERSION_THREE_MARKER", "VERSION_FOUR_MARKER"];
    for (const marker of versions) {
      const changeNotified = awaitFileChanges(server, [FIXTURE_PATH]);
      writeFileSync(FIXTURE_PATH, componentSource("cache-test-component", marker));
      await changeNotified;

      const html = await renderVia(server, RENDER_FIXTURE_URL);
      expect(html, `iteration "${marker}" did not pick up the edit`).toContain(marker);
      // Previous markers must be gone — no carry-over from prior iterations.
      const previous = ["VERSION_ONE_MARKER", ...versions.slice(0, versions.indexOf(marker))];
      for (const stale of previous) {
        expect(html, `iteration "${marker}" still contains stale "${stale}"`).not.toContain(stale);
      }
    }
  });

  // -------------------------------------------------------------------------
  // 5) Transitive dependency: editing a non-component file that the
  //    component imports also propagates. Vite cascades invalidation along
  //    the import graph; this test pins down that the component module
  //    re-executes (and hits the re-registration path) even when the
  //    triggering edit isn't on the decorated file itself.
  // -------------------------------------------------------------------------

  test("editing a non-component file imported by a component re-renders the component", async () => {
    server = await bootViteServer();

    const html1 = await renderVia(server, RENDER_HELPER_URL);
    expect(html1).toContain("HELPER_V1");

    const changeNotified = awaitFileChanges(server, [HELPER_MARKER_PATH]);
    writeFileSync(HELPER_MARKER_PATH, helperMarkerSource("HELPER_V2"));
    await changeNotified;

    const html2 = await renderVia(server, RENDER_HELPER_URL);
    expect(
      html2,
      "Editing a transitive dependency did not propagate. Either Vite's cascading invalidation regressed, or the decorator's re-registration didn't run when the component module re-executed."
    ).toContain("HELPER_V2");
    expect(html2).not.toContain("HELPER_V1");
  });
});
