import { EventEmitter } from "events";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the build package so we can assert HOW `buildLibrary` is invoked by the
// dev-server file-watch handlers (full vs partial scan), without running a real
// analysis.
type BuildLibrarySignature = (options?: unknown, incrementalBuild?: unknown) => Promise<unknown>;

const buildLibrary = vi.fn<BuildLibrarySignature>(async () => ({
  elapsedTimes: {
    analysis: 0,
    librarySummary: 0,
    exportTypesForTheLibrary: 0,
    typeDeclarationsFolder: 0,
    typesForComponents: 0,
    cleanup: 0,
    readmesForComponents: 0
  },
  updatedReadmesForComponents: [],
  updatedTypesForComponents: [],
  componentsBuilded: new Map(),
  cleanedComponentTypeFiles: []
}));

vi.mock("@genexus/kasstor-build", () => ({
  buildLibrary,
  AUTO_GENERATED_MARKER: "\n/* AUTO-GENERATED */\n"
}));

const { configureServer } = await import("../configure-server.js");

type FakeWatcher = EventEmitter & { add: (glob: string) => void };

const createFakeServer = () => {
  const watcher = new EventEmitter() as FakeWatcher;
  watcher.add = () => {};
  return {
    config: {
      root: "/project",
      logger: { info: () => {}, error: () => {}, warn: () => {} }
    },
    watcher
  };
};

// The library build is debounced (~4ms) and async; give it room to settle.
const flush = () => new Promise(resolve => setTimeout(resolve, 40));

describe("configureServer — incremental rebuild triggers", () => {
  let server: ReturnType<typeof createFakeServer>;
  let projectDir: string;

  const attach = () => {
    const kasstorBuildOptions = { includedPaths: /\.lit\.ts$/ };
    const getFileType = (filePath: string) =>
      filePath.endsWith(".lit.ts") ? ("component" as const) : ("unknown" as const);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer({ getFileType, kasstorBuildOptions, server: server as any })();
    return kasstorBuildOptions;
  };

  beforeEach(async () => {
    buildLibrary.mockClear();
    projectDir = await mkdtemp(join(tmpdir(), "kasstor-configure-server-"));
    server = createFakeServer();
    server.config.root = projectDir;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(projectDir, { recursive: true, force: true });
  });

  it("forces a complete scan when a component file is deleted", async () => {
    const kasstorBuildOptions = attach();

    server.watcher.emit("unlink", "/project/src/gone/gone.lit.ts");
    await flush();

    expect(buildLibrary).toHaveBeenCalledTimes(1);
    const [, incrementalArg] = buildLibrary.mock.calls[0];
    // A deletion must run a COMPLETE scan so the deleted component is pruned
    // from the build cache (and the generated files) — not a single-file pass.
    expect(incrementalArg).toEqual({ scanIsComplete: true });
    // And it uses the default broad component pattern, not a narrow per-file one.
    const [optionsArg] = buildLibrary.mock.calls[0];
    expect(optionsArg).toMatchObject({ includedPaths: kasstorBuildOptions.includedPaths });
  });

  it("runs a partial incremental scan when a component file changes", async () => {
    attach();

    // The change handler reads the file (to diff its content), so it must exist.
    const filePath = join(projectDir, "src/card/card.lit.ts");
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, "export class Card {}", "utf-8");

    server.watcher.emit("change", filePath);
    await flush();

    expect(buildLibrary).toHaveBeenCalledTimes(1);
    const [optionsArg, incrementalArg] = buildLibrary.mock.calls[0];
    // A plain change is incremental (boolean `true`, no complete-scan flag) and
    // restricts the scan to the changed file.
    expect(incrementalArg).toBe(true);
    expect((optionsArg as { includedPaths: RegExp }).includedPaths.source).toContain("card");
  });

  it("ignores deletions of non-component files", async () => {
    attach();

    server.watcher.emit("unlink", "/project/src/styles/card.scss");
    await flush();

    expect(buildLibrary).not.toHaveBeenCalled();
  });
});
