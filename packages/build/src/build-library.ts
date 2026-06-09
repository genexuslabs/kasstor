import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { format } from "prettier";
import { fileURLToPath } from "url";

import {
  getComponentDeclaration,
  getReactDeclaration,
  getSolidDeclaration,
  getStencilDeclaration
} from "./component-declaration-file/index.js";
import { cleanupLegacyComponentTypes } from "./global-type-declarations/clean-auto-generated-content.js";
import { resolveFrameworkFileName } from "./internal/resolve-framework-file-name.js";
import { sortByFilePath } from "./internal/sort-by-file-path.js";
import { writeFileIfChanged } from "./internal/write-file-if-changed.js";
import { getLibraryComponents } from "./library-summary/index.js";
import { getComponentReadme } from "./readme/get-component-readme.js";
import { generateTypeDeclarationsFolder } from "./type-declarations-folder/index.js";
import type { KasstorBuildComponentData, KasstorBuildOptions } from "./typings/build-options.js";
import type { ComponentDefinition, LibraryComponents } from "./typings/library-components";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * The generated library summary file is self-typed: the `LibraryComponents`
 * type definitions are appended after the data. Those definitions come from the
 * `library-components` typings file, which sits next to this module — as a
 * compiled `.d.ts` when running from `dist/`, or as the `.ts` typings source
 * when running from source (e.g. tests). Resolve whichever exists, lazily and
 * once, so importing this module never depends on a built sibling file being
 * present.
 */
let librarySummaryTypesPromise: Promise<string> | undefined;
const getLibrarySummaryTypes = (): Promise<string> => {
  librarySummaryTypesPromise ??= (async () => {
    const candidatePaths = [
      join(__dirname, "./typings/library-components.d.ts"),
      join(__dirname, "./typings/library-components.ts")
    ];

    for (const candidatePath of candidatePaths) {
      try {
        return await readFile(candidatePath, "utf-8");
      } catch {
        // Try the next candidate (e.g. the `.ts` source when no `.d.ts`).
      }
    }

    throw new Error(
      `[kasstor-build] Could not find the library-components typings next to "${__dirname}".`
    );
  })();

  return librarySummaryTypesPromise;
};

const DEFAULT_DECLARATION_FILE_NAME = "components.ts";
// const DEFAULT_DECLARATION_FOR_ALL_COPIED_TYPES = "component-copied-types.ts";

// The per-framework JSX type files are all opt-in (React, SolidJS and
// StencilJS). These names are used when the corresponding option is `true`
// (i.e. enabled without an explicit file name).
const DEFAULT_REACT_DECLARATION_FILE_NAME = "components.react.ts";
const DEFAULT_SOLID_DECLARATION_FILE_NAME = "components.solid.ts";
const DEFAULT_STENCIL_DECLARATION_FILE_NAME = "components.stencil.ts";

const DEFAULT_LIBRARY_SUMMARY_FILE_NAME = "library-summary.ts";
const DEFAULT_TYPE_DECLARATIONS_FOLDER = "docs/types";
const DEFAULT_COMPONENT_ACCESS = "public" satisfies ComponentDefinition["access"];
const DEFAULT_INCLUDED_PATHS = /\.lit\.(ts|js)$/;
const DEFAULT_RELATIVE_COMPONENTS_SRC_PATH = "src/";

type BuildCacheTagName = string;

/**
 * Cache to implement incremental build.
 *
 * When running the buildLibrary function in a dev server, it is important to
 * incrementally build the library to improve performance and reduce build times.
 *
 * With this cache, only new or changed components are processed.
 */
let buildCache: Map<BuildCacheTagName, KasstorBuildComponentData> | undefined;

/**
 * Reset the module-level incremental build cache.
 *
 * The cache persists across `buildLibrary` calls within a process to power
 * incremental dev-server builds. Call this to start a fresh analysis — e.g. on
 * a dev-server restart, or to isolate test cases that exercise incremental
 * builds.
 */
export const resetBuildCache = (): void => {
  buildCache = undefined;
};

const writeLibrarySummary = async (
  libraryComponents: LibraryComponents,
  relativeComponentsSrcPath: string,
  fileName: string
) =>
  format(
    `export const librarySummary = ${JSON.stringify(libraryComponents, undefined, 2)} as const satisfies LibraryComponents;\n\n${await getLibrarySummaryTypes()}`,
    { parser: "typescript", trailingComma: "none" }
  ).then(formattedLibrarySummary =>
    writeFileIfChanged(
      join(process.cwd(), relativeComponentsSrcPath, fileName),
      formattedLibrarySummary
    )
  );

const writeReadmes = (
  libraryComponentAndContents: KasstorBuildComponentData[]
): Promise<boolean[]> =>
  Promise.all(
    libraryComponentAndContents.map(({ component, filePath }) =>
      getComponentReadme(component).then(readme =>
        writeFileIfChanged(
          // Save the readme in the same location as the component, but with the
          // name "readme.md"
          filePath.replace(filePath.split("/").at(-1)!, "readme.md"),
          readme
        )
      )
    )
  );

const writeExportTypes = (
  libraryComponents: LibraryComponents,
  filePath: string
): Promise<boolean> => writeFileIfChanged(filePath, getComponentDeclaration(libraryComponents));

const FRAMEWORK_DECLARATION_BUILDERS = {
  react: getReactDeclaration,
  solid: getSolidDeclaration,
  stencil: getStencilDeclaration
} as const;

const writeFrameworkTypes = (
  libraryComponents: LibraryComponents,
  framework: keyof typeof FRAMEWORK_DECLARATION_BUILDERS,
  filePath: string,
  coreFileName: string
): Promise<boolean> =>
  writeFileIfChanged(
    filePath,
    FRAMEWORK_DECLARATION_BUILDERS[framework](libraryComponents, coreFileName)
  );

/**
 * Build the library types, documentation, and summary of the components.
 *
 * This function supports incremental builds using a cache.
 *
 * @param options
 * @param incrementalBuild - Whether to use the cache for incremental builds. With this options, you can skip building the whole library when a single file changes. Make sure to only include the path for the changed file in the `options.includedPaths` option.
 * @returns
 */
export const buildLibrary = async (
  options?: KasstorBuildOptions,
  incrementalBuild?:
    | boolean
    | {
        initialBuild?: Map<string, KasstorBuildComponentData>;

        /**
         * Tag names of components to remove from the cache during incremental builds.
         */
        tagNamesToRemove?: string[];

        /**
         * Whether this run scanned **every** component file (a full scan), as
         * opposed to a single-file incremental pass. When `true`, the freshly
         * scanned set is authoritative: any component still in the cache but
         * absent from the scan had its source file deleted, so it is pruned
         * from the cache (and therefore from the generated library summary and
         * declaration files).
         *
         * Defaults to `false` — for a single-file incremental build, a
         * component's absence from the scan only means it was not re-scanned,
         * not that it was deleted, so the cache must be preserved.
         */
        scanIsComplete?: boolean;
      }
): Promise<{
  /**
   * Indexed by the component tag name it contains the information about the
   * builded component.
   */
  componentsBuilded: Map<string, KasstorBuildComponentData>;

  elapsedTimes: typeof elapsedTimes;

  updatedReadmesForComponents: string[];

  /**
   * @deprecated Always empty. Per-component type files are no longer generated;
   * the custom-element global types now live in the `exportTypesForTheLibrary`
   * file (e.g. `components.ts`).
   */
  updatedTypesForComponents: string[];

  /**
   * Absolute paths of the component files that had their legacy auto-generated
   * content removed by the transitional cleanup (see
   * `fileGeneration.cleanupLegacyComponentTypes`).
   */
  cleanedComponentTypeFiles: string[];
}> => {
  const startTimeAnalysis = performance.now();
  const elapsedTimes = {
    analysis: 0,
    librarySummary: 0,
    exportTypesForTheLibrary: 0,
    typeDeclarationsFolder: 0,
    // Kept for backwards compatibility; per-component type files are no longer
    // generated, so this is always 0.
    typesForComponents: 0,
    cleanup: 0,
    readmesForComponents: 0
  };

  const {
    customComponentDecoratorNames,
    defaultComponentAccess,
    excludedPaths,
    excludedPublicMethods,
    fileGeneration,
    includedPaths,
    relativeComponentsSrcPath = DEFAULT_RELATIVE_COMPONENTS_SRC_PATH
  } = options ?? {};

  const promises: Promise<void | unknown>[] = [];
  let updatedReadmesForComponents: KasstorBuildComponentData[] = [];

  // Resolve the core + per-framework type-file configuration up front, so the
  // coherence validation (framework files require the core file) runs early.
  const coreTypesEnabled =
    fileGeneration !== false && fileGeneration?.exportTypesForTheLibrary !== false;
  const coreTypesFileName =
    fileGeneration !== false && typeof fileGeneration?.exportTypesForTheLibrary === "string"
      ? fileGeneration.exportTypesForTheLibrary
      : DEFAULT_DECLARATION_FILE_NAME;
  const reactTypesFileName = resolveFrameworkFileName(
    fileGeneration,
    "exportTypesForReact",
    DEFAULT_REACT_DECLARATION_FILE_NAME,
    false,
    coreTypesEnabled
  );
  const solidTypesFileName = resolveFrameworkFileName(
    fileGeneration,
    "exportTypesForSolidJs",
    DEFAULT_SOLID_DECLARATION_FILE_NAME,
    false,
    coreTypesEnabled
  );
  const stencilTypesFileName = resolveFrameworkFileName(
    fileGeneration,
    "exportTypesForStencil",
    DEFAULT_STENCIL_DECLARATION_FILE_NAME,
    false,
    coreTypesEnabled
  );

  const libraryComponentAndContents = await getLibraryComponents({
    customComponentDecoratorNames,
    defaultComponentAccess: defaultComponentAccess ?? DEFAULT_COMPONENT_ACCESS,
    excludedPaths,
    excludedPublicMethods,
    generatedExportTypesFilePath: coreTypesEnabled
      ? join(process.cwd(), relativeComponentsSrcPath, coreTypesFileName)
      : undefined,
    includedPaths: includedPaths ?? DEFAULT_INCLUDED_PATHS,
    relativeComponentsSrcPath
  });

  // Decide which readmes to regenerate (readme generation runs prettier +
  // micromark per component, so it is worth skipping unchanged ones).
  //
  // The readme is a pure function of the analyzed component, which is itself a
  // deterministic function of the source file content (the per-file path and
  // the build options are fixed for the process). So comparing `fileContent`
  // is an exact proxy for "the analysis changed" — without serializing every
  // component on every build (a `JSON.stringify` of both sides was ~150x
  // slower in a 30-component benchmark). A file edit that doesn't alter the
  // public API at worst regenerates an identical readme, which the atomic
  // `writeFileIfChanged` then skips.
  if (buildCache) {
    libraryComponentAndContents.forEach(componentData => {
      const cachedComponentData = buildCache!.get(componentData.component.tagName);

      if (
        cachedComponentData === undefined ||
        componentData.fileContent !== cachedComponentData.fileContent
      ) {
        updatedReadmesForComponents.push(componentData);
      }
    });
  } else {
    updatedReadmesForComponents = libraryComponentAndContents;
  }

  // Update the incremental build cache with the new values
  if (incrementalBuild) {
    const { initialBuild, tagNamesToRemove, scanIsComplete } =
      typeof incrementalBuild === "object" ? incrementalBuild : {};

    if (scanIsComplete) {
      // A complete scan is authoritative: rebuild the cache to mirror exactly
      // what exists on disk right now. This naturally drops any component whose
      // source file was deleted (or whose tag was renamed) since the last
      // build — otherwise it would linger in the cache and keep being written
      // into the generated files on every rebuild.
      buildCache = new Map(
        libraryComponentAndContents.map(data => [data.component.tagName, data])
      );
    } else {
      // Partial (single-file) scan: keep the rest of the library from the cache
      // and merge in just the re-scanned files. An absent component here simply
      // was not re-scanned — not deleted — so the cache must be preserved.
      // Seed from `initialBuild` the first time (e.g. an initial full analysis
      // handed off to the dev server's incremental builds).
      buildCache ??= initialBuild ?? new Map();
      tagNamesToRemove?.forEach(tagName => buildCache!.delete(tagName));
      libraryComponentAndContents.forEach(data =>
        buildCache!.set(data.component.tagName, data)
      );
    }
  }

  const allLibraryComponents = incrementalBuild
    ? sortByFilePath(Array.from(buildCache!.values())).map(({ component }) => component)
    : libraryComponentAndContents.map(({ component }) => component);

  // END of analysis
  elapsedTimes.analysis = performance.now() - startTimeAnalysis;

  // Library Summary file
  if (fileGeneration !== false && fileGeneration?.librarySummary !== false) {
    const startTimeLibrarySummary = performance.now();

    promises.push(
      writeLibrarySummary(
        allLibraryComponents,
        relativeComponentsSrcPath,
        fileGeneration?.librarySummary ?? DEFAULT_LIBRARY_SUMMARY_FILE_NAME
      ).then(() => {
        // END of librarySummary
        elapsedTimes.librarySummary = performance.now() - startTimeLibrarySummary;
      })
    );
  }

  // Transitional cleanup: remove the legacy auto-generated content (the marker
  // + `declare global` block) that the previous `typesForComponents` generation
  // appended to each component file. That content now lives in the
  // `exportTypesForTheLibrary` file. Decoupled and gated by a flag (enabled by
  // default) so it can be disabled in the future.
  let cleanedComponentTypeFiles: string[] = [];
  if (fileGeneration !== false && fileGeneration?.cleanupLegacyComponentTypes !== false) {
    const startTimeCleanup = performance.now();

    promises.push(
      cleanupLegacyComponentTypes({
        includedPaths: includedPaths ?? DEFAULT_INCLUDED_PATHS,
        excludedPaths,
        relativeComponentsSrcPath
      }).then(cleanedFilePaths => {
        cleanedComponentTypeFiles = cleanedFilePaths;
        // END of cleanup
        elapsedTimes.cleanup = performance.now() - startTimeCleanup;
      })
    );
  }

  // Readme for components
  if (
    fileGeneration !== false &&
    fileGeneration?.readmesForComponents !== false &&
    updatedReadmesForComponents.length !== 0
  ) {
    const startTimeAutoGeneratedReadmesForComponents = performance.now();

    promises.push(
      writeReadmes(updatedReadmesForComponents).then(() => {
        // END of autoGeneratedReadmesForComponents
        elapsedTimes.readmesForComponents =
          performance.now() - startTimeAutoGeneratedReadmesForComponents;
      })
    );
  }

  // One declaration file per type (docs/types by default)
  if (fileGeneration !== false && fileGeneration?.typeDeclarationsFolder !== false) {
    const startTimeTypeDeclarationsFolder = performance.now();
    const typeDeclarationsOutputDir = join(
      process.cwd(),
      fileGeneration?.typeDeclarationsFolder ?? DEFAULT_TYPE_DECLARATIONS_FOLDER
    );
    promises.push(
      generateTypeDeclarationsFolder(
        allLibraryComponents,
        relativeComponentsSrcPath,
        typeDeclarationsOutputDir
      ).then(() => {
        elapsedTimes.typeDeclarationsFolder = performance.now() - startTimeTypeDeclarationsFolder;
      })
    );
  }

  // Core (framework-agnostic) `components.ts` + the per-framework JSX type
  // files (React, SolidJS and StencilJS, all opt-in). The per-framework files
  // depend on the core file (its global custom-element types and the re-exported
  // property types; StencilJS also re-uses the core `ComponentProperties`
  // namespace), so they are only written when the core file is generated.
  if (coreTypesEnabled) {
    const startTimeAutoGeneratedExportTypesForComponents = performance.now();

    const resolvePath = (fileName: string) =>
      join(process.cwd(), relativeComponentsSrcPath, fileName);

    const exportTypesPromises: Promise<boolean>[] = [
      writeExportTypes(allLibraryComponents, resolvePath(coreTypesFileName))
    ];

    if (reactTypesFileName) {
      exportTypesPromises.push(
        writeFrameworkTypes(
          allLibraryComponents,
          "react",
          resolvePath(reactTypesFileName),
          coreTypesFileName
        )
      );
    }
    if (solidTypesFileName) {
      exportTypesPromises.push(
        writeFrameworkTypes(
          allLibraryComponents,
          "solid",
          resolvePath(solidTypesFileName),
          coreTypesFileName
        )
      );
    }
    if (stencilTypesFileName) {
      exportTypesPromises.push(
        writeFrameworkTypes(
          allLibraryComponents,
          "stencil",
          resolvePath(stencilTypesFileName),
          coreTypesFileName
        )
      );
    }

    promises.push(
      Promise.all(exportTypesPromises).then(() => {
        // END of autoGeneratedExportTypesForComponents
        elapsedTimes.exportTypesForTheLibrary =
          performance.now() - startTimeAutoGeneratedExportTypesForComponents;
      })
    );
  }

  await Promise.all(promises);

  return {
    componentsBuilded: new Map(
      libraryComponentAndContents.map(componentAndContent => [
        componentAndContent.component.tagName,
        componentAndContent
      ])
    ),

    elapsedTimes,

    updatedReadmesForComponents: updatedReadmesForComponents.map(
      ({ component }) => component.tagName
    ),

    // Per-component type files are no longer generated (the custom-element
    // global types now live in the exportTypesForTheLibrary file).
    updatedTypesForComponents: [],

    cleanedComponentTypeFiles
  };
};
