import { readdir } from "fs/promises";
import { join } from "path";
import { normalizePath } from "./normalize-path.js";

/**
 * Find Lit component files in the specified directory
 */
export const findLitComponents = async (options: {
  excludedPaths: string[];
  includedPaths: RegExp | RegExp[];
  pattern: string;
}): Promise<string[]> => {
  const { excludedPaths, includedPaths, pattern } = options;
  const excludedNormalizedPaths = excludedPaths.map(normalizePath);

  const filesAndDirs = await readdir(pattern, {
    recursive: true,
    withFileTypes: true
  });

  const files: string[] = [];
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
        excludedNormalizedPaths.every(
          substring => !fullFilePath.includes(substring)
        )
      ) {
        files.push(fullFilePath);
      }
    }
  }

  return files.sort((a, b) => (a <= b ? -1 : 0));
};

