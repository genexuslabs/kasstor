import { writeFile } from "fs/promises";
import { join } from "path";
import * as prettier from "prettier";
import { extractLibraryComponents } from "./generator";

export const getLibrarySummary = (relativeComponentsSrcPath: string) =>
  extractLibraryComponents(join(process.cwd(), relativeComponentsSrcPath));

export const generateLibrarySummary = async (
  relativeComponentsSrcPath: string,
  resultFilePath = "library-summary.ts"
) => {
  const result = await getLibrarySummary(relativeComponentsSrcPath);

  return writeFile(
    resultFilePath,
    `export const result = ${await prettier.format(JSON.stringify(result, undefined, 2), { parser: "typescript" })}`
  );
};

