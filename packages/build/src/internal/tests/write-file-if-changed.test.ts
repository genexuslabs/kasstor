import { mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeFileIfChanged } from "../write-file-if-changed.js";

describe("writeFileIfChanged", () => {
  let dir: string;
  let target: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "kasstor-write-if-changed-"));
    target = join(dir, "components.ts");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates the file when it does not exist and reports it was written", async () => {
    const written = await writeFileIfChanged(target, "hello");

    expect(written).toBe(true);
    expect(await readFile(target, "utf-8")).toBe("hello");
  });

  it("skips the write (and does not touch mtime) when the content is identical", async () => {
    await writeFileIfChanged(target, "same content");
    const mtimeBefore = (await stat(target)).mtimeMs;

    const written = await writeFileIfChanged(target, "same content");

    expect(written).toBe(false);
    // No write happened, so the modification time is byte-for-byte unchanged —
    // this is what prevents external watchers (tsgo --watch, other Vite
    // instances) from being re-triggered by a no-op regeneration.
    expect((await stat(target)).mtimeMs).toBe(mtimeBefore);
  });

  it("writes (and reports it) when the content changed", async () => {
    await writeFileIfChanged(target, "v1");

    const written = await writeFileIfChanged(target, "v2");

    expect(written).toBe(true);
    expect(await readFile(target, "utf-8")).toBe("v2");
  });

  it("does not leave temp files behind", async () => {
    await writeFileIfChanged(target, "v1");
    await writeFileIfChanged(target, "v2");

    const { readdir } = await import("fs/promises");
    const entries = await readdir(dir);

    // Only the target file should remain — the atomic write must clean up after
    // itself (temp sibling is renamed over the target, never left dangling).
    expect(entries).toEqual(["components.ts"]);
  });

  it("never exposes a truncated file to a concurrent reader", async () => {
    // Seed a large previous version, then overwrite with a different large
    // version while continuously reading. An atomic rename guarantees every
    // read observes a complete version (old or new), never an empty/partial
    // file (which is what made `tsgo` fail with "is not a module").
    const previous = "a".repeat(200_000);
    const next = "b".repeat(200_000);
    await writeFile(target, previous, "utf-8");

    let stop = false;
    const observed = new Set<number>();
    const reader = (async () => {
      while (!stop) {
        try {
          observed.add((await readFile(target, "utf-8")).length);
        } catch {
          // ENOENT during rename is acceptable; a partial length is not.
        }
      }
    })();

    for (let i = 0; i < 50; i++) {
      await writeFileIfChanged(target, i % 2 === 0 ? next : previous);
    }
    stop = true;
    await reader;

    // Every observed read had a complete length — never a truncated one.
    for (const length of observed) {
      expect([previous.length, next.length]).toContain(length);
    }
  });
});
