import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { normalizePath } from "./normalize-path.js";

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

  const filesAndDirs = await readdir(pattern, {
    recursive: true,
    withFileTypes: true
  });

  const files: Promise<{ filePath: string; fileContent: string }>[] = [];
  const includedPathsArray = Array.isArray(includedPaths)
    ? includedPaths
    : [includedPaths];

  for (let index = 0; index < filesAndDirs.length; index++) {
    const filesOrDir = filesAndDirs[index];

    if (filesOrDir.isFile()) {
      const fullFilePath = normalizePath(
        join(filesOrDir.parentPath, filesOrDir.name)
      );

      if (
        // If it's included in some of the includedPaths patterns
        includedPathsArray.some(pattern => fullFilePath.match(pattern)) &&
        // And it's not excluded by any of the excludedPaths patterns
        excludedPathsArray.every(pattern => !fullFilePath.match(pattern))
      ) {
        files.push(
          readFile(fullFilePath, "utf-8").then(fileContent => ({
            filePath: fullFilePath,
            fileContent
          }))
        );
      }
    }
  }

  return (await Promise.all(files)).sort((a, b) =>
    a.filePath <= b.filePath ? -1 : 0
  );
};

