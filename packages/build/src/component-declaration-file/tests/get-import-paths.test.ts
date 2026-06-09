import { describe, expect, it } from "vitest";

import {
  getAllPropertiesEventAndMethodsExports,
  getComponentImport,
  getComponentImports,
  getImportPaths,
  mergeTypeImports,
  sortImports
} from "../get-import-paths.js";
import { makeComponent } from "./fixtures.js";

// The import/re-export header is driven exclusively by `srcPath`, `className`,
// and the three `*ImportTypes` records. Methods only reach `components.ts`
// through `methodImportTypes` (their signatures are never emitted here), so the
// spec's "methods" partition is exercised through these import-type tests.
describe("[component-declaration-file] sortImports", () => {
  // `sortImports` is a non-standard comparator (it never returns a positive
  // value). These cases pin down its exact branch behavior so a refactor that
  // changes the ordering is caught.
  it("returns 0 when only the first path is relative", () => {
    expect(sortImports("./a", "b")).toBe(0);
  });

  it("returns -1 when only the second path is relative", () => {
    expect(sortImports("a", "./b")).toBe(-1);
  });

  it("compares lexicographically when both paths are relative", () => {
    expect(sortImports("./a", "./b")).toBe(-1);
  });

  it("compares lexicographically when neither path is relative", () => {
    expect(sortImports("a", "b")).toBe(-1);
    expect(sortImports("b", "a")).toBe(0);
  });
});

describe("[component-declaration-file] mergeTypeImports", () => {
  it("creates a new entry for an unseen module path", () => {
    const map = new Map<string, Set<string>>();

    mergeTypeImports({ "./types.js": ["A", "B"] }, map);

    expect(map).toEqual(new Map([["./types.js", new Set(["A", "B"])]]));
  });

  it("merges into an existing module path without duplicating types", () => {
    const map = new Map<string, Set<string>>([["./types.js", new Set(["A"])]]);

    mergeTypeImports({ "./types.js": ["B", "A"] }, map);

    expect(map).toEqual(new Map([["./types.js", new Set(["A", "B"])]]));
  });
});

describe("[component-declaration-file] getComponentImport", () => {
  it("imports the class with the `Element` suffix alias from its srcPath", () => {
    const component = makeComponent({
      className: "KstFoo",
      srcPath: "./foo.lit.ts"
    });

    expect(getComponentImport(component)).toBe(
      `import type { KstFoo as KstFooElement } from "./foo.lit.ts";`
    );
  });
});

describe("[component-declaration-file] getComponentImports", () => {
  it("sorts the components array in place by source path", () => {
    const components = [
      makeComponent({ className: "B", srcPath: "b.ts" }),
      makeComponent({ className: "A", srcPath: "a.ts" })
    ];

    getComponentImports(components);

    // The mutation is observable on the original array reference.
    expect(components.map(({ className }) => className)).toMatchSnapshot();
  });

  it("renders one import line per component", () => {
    const components = [
      makeComponent({ className: "A", srcPath: "a.ts" }),
      makeComponent({ className: "B", srcPath: "b.ts" })
    ];

    expect(getComponentImports(components)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getAllPropertiesEventAndMethodsExports", () => {
  it("returns empty import and export blocks when no type imports exist", () => {
    expect(getAllPropertiesEventAndMethodsExports([makeComponent()])).toMatchSnapshot();
  });

  it("imports and re-exports property types", () => {
    const components = [makeComponent({ propertyImportTypes: { "./types.js": ["MyType"] } })];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });

  it("imports and re-exports event types", () => {
    const components = [makeComponent({ eventImportTypes: { "./events.js": ["MyEventDetail"] } })];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });

  it("imports and re-exports method types", () => {
    const components = [makeComponent({ methodImportTypes: { "./methods.js": ["MyMethodArg"] } })];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });

  it("merges property, event and method types of a single component", () => {
    const components = [
      makeComponent({
        propertyImportTypes: { "./types.js": ["PropType"] },
        eventImportTypes: { "./types.js": ["EventType"] },
        methodImportTypes: { "./types.js": ["MethodType"] }
      })
    ];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });

  it("merges and de-duplicates the same module across components", () => {
    const components = [
      makeComponent({
        className: "A",
        srcPath: "a.ts",
        propertyImportTypes: { "./shared.js": ["Shared", "OnlyA"] }
      }),
      makeComponent({
        className: "B",
        srcPath: "b.ts",
        eventImportTypes: { "./shared.js": ["Shared", "OnlyB"] }
      })
    ];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });

  it("sorts relative and external module specifiers", () => {
    const components = [
      makeComponent({
        propertyImportTypes: {
          "./local.js": ["LocalType"],
          "@scope/pkg": ["ExternalType"]
        }
      })
    ];

    expect(getAllPropertiesEventAndMethodsExports(components)).toMatchSnapshot();
  });
});

describe("[component-declaration-file] getImportPaths", () => {
  it("composes the type-imports and component-imports sections", () => {
    const components = [
      makeComponent({
        className: "KstField",
        srcPath: "./kst-field.lit.ts",
        propertyImportTypes: { "./types.js": ["FieldVariant"] },
        methodImportTypes: { "./types.js": ["FocusOptions"] }
      })
    ];

    expect(getImportPaths(components)).toMatchSnapshot();
  });
});
