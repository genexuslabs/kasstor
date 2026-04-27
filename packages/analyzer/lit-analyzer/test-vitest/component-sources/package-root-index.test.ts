import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { PackageRootIndex } from "../../src/lib/analyze/component-sources/package-root-index.js";

/**
 * Regression coverage for the `coversSourceFile` boundary check. The
 * symptom these tests pin: when Cursor's tsserver supplies the program
 * root in lower-case (`d:/GitHub/...`) but the source files come back
 * with the canonical drive-letter case (`D:/GitHub/...`), every kasstor
 * tag whose `.lit.ts` ends up in the program got clobbered by the
 * source-file scanner because the index falsely reported the file as
 * "not covered" by the kasstor library-summary.
 */
function fakeSF(fileName: string): ts.SourceFile {
  return { fileName } as ts.SourceFile;
}

describe("PackageRootIndex.cover", () => {
  it("matches files regardless of drive-letter case (Windows hosts)", () => {
    const idx = new PackageRootIndex();
    idx.add("d:\\GitHub\\chameleon\\packages\\chameleon", "<kasstor>");

    expect(idx.cover(fakeSF("D:/GitHub/chameleon/packages/chameleon/src/components/x.ts"))).toBe(
      "<kasstor>"
    );
    expect(idx.cover(fakeSF("d:/GitHub/chameleon/packages/chameleon/src/components/x.ts"))).toBe(
      "<kasstor>"
    );
    expect(idx.cover(fakeSF("d:\\GitHub\\chameleon\\packages\\chameleon\\src\\x.ts"))).toBe(
      "<kasstor>"
    );
  });

  it("respects directory boundaries (sibling packages must not match)", () => {
    const idx = new PackageRootIndex();
    idx.add("d:/GitHub/chameleon/packages/chameleon", "<kasstor>");

    expect(idx.cover(fakeSF("D:/GitHub/chameleon/packages/showcase/x.ts"))).toBeUndefined();
    expect(idx.cover(fakeSF("D:/Other/repo/file.ts"))).toBeUndefined();
  });

  it("matches the root itself when fileName equals the registered path", () => {
    const idx = new PackageRootIndex();
    idx.add("D:/PROJECT/pkg", "<root>");
    expect(idx.cover(fakeSF("d:/project/pkg"))).toBe("<root>");
  });

  it("ranks longer roots first when multiple manifests are registered", () => {
    const idx = new PackageRootIndex();
    idx.add("d:/repo", "<repo>");
    idx.add("d:/repo/packages/inner", "<inner>");

    expect(idx.cover(fakeSF("D:/REPO/packages/inner/src/x.ts"))).toBe("<inner>");
    expect(idx.cover(fakeSF("D:/REPO/packages/other/src/x.ts"))).toBe("<repo>");
  });

  it("normalizes back-slashes in synthetic SourceFile fileNames", () => {
    const idx = new PackageRootIndex();
    idx.add("/var/repo", "<x>");
    expect(idx.cover(fakeSF("\\var\\repo\\src\\x.ts"))).toBe("<x>");
  });
});
