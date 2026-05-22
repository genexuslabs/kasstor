// `getStyleSheetPromiseInfo` is the rendezvous point between code that wants
// to wait for a bundle to load (e.g. the `@Component` decorator's pre-fetch
// path) and code that supplies the bundle (`setStyleSheetMapping`, called
// once the CSS is available). The returned `{ promise, promiseResolver,
// isDownloading }` triple is cached on `globalThis` per bundle name so a
// second consumer reuses the SAME promise — that is what makes
// "two components, one bundle" work without duplicate fetches.
//
// These tests cover that contract without touching `CSSStyleSheet` (which
// only exists in the browser), so they live in the Node-only `.spec.ts`
// pool alongside `register-design-system.spec.ts`.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getStyleSheetPromiseInfo } from "../get-style-sheet-promise-info";

function clearPromiseCache(): void {
  globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
  globalThis.geneXusDesignSystemsStyleSheets?.clear();
}

describe("[design-system] [getStyleSheetPromiseInfo]", () => {
  beforeEach(clearPromiseCache);
  afterEach(clearPromiseCache);

  test("first call for a bundle name creates a fresh entry with `isDownloading=false` and a not-yet-resolved promise", () => {
    const info = getStyleSheetPromiseInfo("first-time");

    expect(info.isDownloading).toBe(false);
    expect(info.promise).toBeInstanceOf(Promise);
    expect(typeof info.promiseResolver).toBe("function");
    // The entry is cached on globalThis so a second consumer finds it.
    expect(globalThis.geneXusDesignSystemsStyleSheetPromises?.get("first-time")).toBe(info);
  });

  test("subsequent calls for the SAME bundle name return the SAME object — consumers share one in-flight promise (no duplicate fetches)", () => {
    const a = getStyleSheetPromiseInfo("shared");
    const b = getStyleSheetPromiseInfo("shared");
    expect(b).toBe(a);
    expect(b.promise).toBe(a.promise);
    expect(b.promiseResolver).toBe(a.promiseResolver);
  });

  test("calling `promiseResolver` settles the promise with the supplied value AND evicts the entry from the cache so the next call starts a brand-new cycle", async () => {
    const first = getStyleSheetPromiseInfo("settled");
    first.promiseResolver({ name: "settled", styleSheet: undefined });

    const result = await first.promise;
    expect(result).toEqual({ name: "settled", styleSheet: undefined });

    // The entry is cleared after the resolver fires — the cache only
    // holds in-flight promises, never settled ones. That guarantees a
    // later registration creates a fresh promise rather than handing
    // out the already-resolved one.
    expect(globalThis.geneXusDesignSystemsStyleSheetPromises?.has("settled")).toBe(false);

    const second = getStyleSheetPromiseInfo("settled");
    expect(second).not.toBe(first);
    expect(second.promise).not.toBe(first.promise);
    expect(second.isDownloading).toBe(false);
  });

  test("each bundle name lives in its own slot — resolving one entry does not affect any other", async () => {
    const a = getStyleSheetPromiseInfo("bundle-a");
    const b = getStyleSheetPromiseInfo("bundle-b");

    expect(a).not.toBe(b);

    a.promiseResolver({ name: "bundle-a", styleSheet: undefined });
    await a.promise;

    // `bundle-b` is still in-flight: same object reference, unresolved.
    expect(globalThis.geneXusDesignSystemsStyleSheetPromises?.get("bundle-b")).toBe(b);
  });

  test("times out after the configured `timeout` (resolves with `styleSheet: undefined`) so callers never wait forever for a misconfigured bundle", async () => {
    // 5 ms keeps the test fast — the real default is THEME_LOAD_TIMEOUT
    // (10 s in production), but the timeout path is the same code.
    const info = getStyleSheetPromiseInfo("times-out", 5);
    const result = await info.promise;
    expect(result).toEqual({ name: "times-out", styleSheet: undefined });
  });

  test("once a bundle has timed out, subsequent calls return the SAME (already-resolved) entry — the failure is sticky, no retry storm", async () => {
    // Distinct from the `promiseResolver` path (tested above), the timeout
    // path does NOT evict the entry from the cache. That is intentional:
    // a misconfigured bundle should fail fast on every request instead of
    // restarting a fresh 10-second wait per consumer.
    const first = getStyleSheetPromiseInfo("sticky-failure", 5);
    const firstResult = await first.promise;
    expect(firstResult).toEqual({ name: "sticky-failure", styleSheet: undefined });

    const second = getStyleSheetPromiseInfo("sticky-failure", 5);
    expect(second).toBe(first);
    // The cached promise is already resolved — awaiting it is instant.
    await expect(second.promise).resolves.toEqual({
      name: "sticky-failure",
      styleSheet: undefined
    });
  });
});
