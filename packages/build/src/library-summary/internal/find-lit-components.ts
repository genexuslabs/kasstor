import { readFile } from "fs/promises";
import { sortByFilePath } from "../../internal/sort-by-file-path.js";
import { readAllFiles } from "./read-all-paths.js";

/**
 * Find component files in the specified directory
 */
export const findComponents = async (options: {
  excludedPaths: RegExp | RegExp[];
  includedPaths: RegExp | RegExp[];
  pattern: string;
}): Promise<{ filePath: string; fileContent: string }[]> => {
  const { excludedPaths, includedPaths, pattern } = options;
  const excludedPathsArray = Array.isArray(excludedPaths)
    ? excludedPaths
    : [excludedPaths];

  const filesWithoutContent = await readAllFiles(pattern);

  const files: Promise<{ filePath: string; fileContent: string }>[] = [];
  const includedPathsArray = Array.isArray(includedPaths)
    ? includedPaths
    : [includedPaths];

  for (let index = 0; index < filesWithoutContent.length; index++) {
    const filePath = filesWithoutContent[index].path;

    if (
      // If it's included in some of the includedPaths patterns
      includedPathsArray.some(pattern => filePath.match(pattern)) &&
      // And it's not excluded by any of the excludedPaths patterns
      excludedPathsArray.every(pattern => !filePath.match(pattern))
    ) {
      files.push(
        readFile(filePath, "utf-8").then(fileContent => ({
          filePath,
          fileContent
        }))
      );
    }
  }

  return sortByFilePath(await Promise.all(files));
};

