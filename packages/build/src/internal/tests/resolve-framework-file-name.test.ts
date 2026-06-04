import { describe, expect, it } from "vitest";

import { resolveFrameworkFileName } from "../resolve-framework-file-name.js";

describe("resolveFrameworkFileName", () => {
  it("returns false when all file generation is disabled", () => {
    expect(
      resolveFrameworkFileName(false, "exportTypesForReact", "components.react.ts", false)
    ).toBe(false);
  });

  it("returns the default file name when the option is omitted (React on by default)", () => {
    expect(resolveFrameworkFileName({}, "exportTypesForReact", "components.react.ts", true)).toBe(
      "components.react.ts"
    );
  });

  it("returns false when the default is opt-in (SolidJS/StencilJS off by default)", () => {
    expect(resolveFrameworkFileName({}, "exportTypesForSolidJs", false, true)).toBe(false);
    expect(resolveFrameworkFileName({}, "exportTypesForStencil", false, true)).toBe(false);
  });

  it("honors an explicit custom file name", () => {
    expect(
      resolveFrameworkFileName(
        { exportTypesForSolidJs: "components.solid.ts" },
        "exportTypesForSolidJs",
        false,
        true
      )
    ).toBe("components.solid.ts");
  });

  it("honors an explicit false (disables a default-on framework)", () => {
    expect(
      resolveFrameworkFileName(
        { exportTypesForReact: false },
        "exportTypesForReact",
        "components.react.ts",
        true
      )
    ).toBe(false);
  });

  it("auto-disables a default-on framework when the core file is disabled", () => {
    // React defaults on, but the core file is disabled and React was not
    // explicitly requested -> yield silently to the explicit core=false.
    expect(
      resolveFrameworkFileName(
        { exportTypesForTheLibrary: false },
        "exportTypesForReact",
        "components.react.ts",
        false
      )
    ).toBe(false);
  });

  it("throws when a framework is explicitly enabled but the core file is disabled", () => {
    expect(() =>
      resolveFrameworkFileName(
        {
          exportTypesForTheLibrary: false,
          exportTypesForReact: "components.react.ts"
        },
        "exportTypesForReact",
        "components.react.ts",
        false
      )
    ).toThrow(/requires "fileGeneration.exportTypesForTheLibrary"/);
  });

  it("does not throw when a framework is explicitly false and the core file is disabled", () => {
    expect(
      resolveFrameworkFileName(
        {
          exportTypesForTheLibrary: false,
          exportTypesForStencil: false
        },
        "exportTypesForStencil",
        false,
        false
      )
    ).toBe(false);
  });
});
