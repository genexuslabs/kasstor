import { describe, expect, it } from "vitest";

import { resolveFrameworkFileName } from "../resolve-framework-file-name.js";

describe("resolveFrameworkFileName", () => {
  it("returns false when all file generation is disabled", () => {
    expect(
      resolveFrameworkFileName(false, "exportTypesForReact", "components.react.ts", true, false)
    ).toBe(false);
  });

  it("returns the default file name when the option is omitted (React on by default)", () => {
    expect(
      resolveFrameworkFileName({}, "exportTypesForReact", "components.react.ts", true, true)
    ).toBe("components.react.ts");
  });

  it("returns false when the framework is opt-in and omitted (SolidJS/StencilJS off by default)", () => {
    expect(
      resolveFrameworkFileName({}, "exportTypesForSolidJs", "components.solid.ts", false, true)
    ).toBe(false);
    expect(
      resolveFrameworkFileName({}, "exportTypesForStencil", "components.stencil.ts", false, true)
    ).toBe(false);
  });

  it("uses the default file name when set to true", () => {
    expect(
      resolveFrameworkFileName(
        { exportTypesForSolidJs: true },
        "exportTypesForSolidJs",
        "components.solid.ts",
        false,
        true
      )
    ).toBe("components.solid.ts");
  });

  it("honors an explicit custom file name", () => {
    expect(
      resolveFrameworkFileName(
        { exportTypesForSolidJs: "my-solid-types.ts" },
        "exportTypesForSolidJs",
        "components.solid.ts",
        false,
        true
      )
    ).toBe("my-solid-types.ts");
  });

  it("honors an explicit false (disables a default-on framework)", () => {
    expect(
      resolveFrameworkFileName(
        { exportTypesForReact: false },
        "exportTypesForReact",
        "components.react.ts",
        true,
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
        true,
        false
      )
    ).toBe(false);
  });

  it("throws when a framework is explicitly enabled (string) but the core file is disabled", () => {
    expect(() =>
      resolveFrameworkFileName(
        {
          exportTypesForTheLibrary: false,
          exportTypesForReact: "components.react.ts"
        },
        "exportTypesForReact",
        "components.react.ts",
        true,
        false
      )
    ).toThrow(/requires "fileGeneration.exportTypesForTheLibrary"/);
  });

  it("throws when a framework is explicitly enabled (true) but the core file is disabled", () => {
    expect(() =>
      resolveFrameworkFileName(
        {
          exportTypesForTheLibrary: false,
          exportTypesForSolidJs: true
        },
        "exportTypesForSolidJs",
        "components.solid.ts",
        false,
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
        "components.stencil.ts",
        false,
        false
      )
    ).toBe(false);
  });
});
