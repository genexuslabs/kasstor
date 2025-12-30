import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { format } from "prettier";
import { fileURLToPath } from "url";
import { getLibrarySummary } from "./library-summary/index.js";
import type { ComponentDefinition } from "./library-summary/types.js";
import type { KasstorBuildOptions } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const librarySummaryTypes = await readFile(
  join(__dirname, "./library-summary/types.d.ts"),
  "utf-8"
);

// const DEFAULT_DECLARATION_FILE_NAME = "components.ts";
// const DEFAULT_DECLARATION_FOR_ALL_COPIED_TYPES = "component-copied-types.ts";
const DEFAULT_LIBRARY_SUMMARY_FILE_NAME = "library-summary.ts";
const DEFAULT_COMPONENT_ACCESS =
  "public" satisfies ComponentDefinition["access"];
const DEFAULT_INCLUDED_PATHS = /\.lit\.ts$/;
const DEFAULT_RELATIVE_COMPONENTS_SRC_PATH = "src/";

export const buildLibrary = async (options?: KasstorBuildOptions) => {
  const startTime = performance.now();

  const {
    customDecoratorNames,
    defaultComponentAccess,
    excludedPaths,
    excludedPublicMethods,
    fileGeneration,
    includedPaths,
    relativeComponentsSrcPath
  } = options ?? {};

  const librarySummary = await getLibrarySummary({
    customDecoratorNames,
    defaultComponentAccess: defaultComponentAccess ?? DEFAULT_COMPONENT_ACCESS,
    excludedPaths,
    excludedPublicMethods,
    includedPaths: includedPaths ?? DEFAULT_INCLUDED_PATHS,
    relativeComponentsSrcPath:
      relativeComponentsSrcPath ?? DEFAULT_RELATIVE_COMPONENTS_SRC_PATH
  });

  const promises: Promise<void>[] = [];

  // Library Summary file
  if (fileGeneration?.librarySummary !== false) {
    promises.push(
      writeFile(
        join(
          process.cwd(),
          relativeComponentsSrcPath ?? DEFAULT_RELATIVE_COMPONENTS_SRC_PATH,
          fileGeneration?.librarySummary ?? DEFAULT_LIBRARY_SUMMARY_FILE_NAME
        ),
        await format(
          `export const librarySummary = ${JSON.stringify(librarySummary, undefined, 2)} as const satisfies LibraryComponents;\n\n${librarySummaryTypes}`,
          { parser: "typescript", trailingComma: "none" }
        )
      )
    );
  }

  await Promise.all(promises);

  console.log(`Build completed in ${performance.now() - startTime}ms`);
};

