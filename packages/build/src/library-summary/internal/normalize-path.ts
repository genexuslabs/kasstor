import { dirname, extname, relative, resolve } from "path";

/**
 * Normalize path to use forward slashes (cross-platform compatibility)
 */
export const normalizePath = (filePath: string): string => {
  return filePath.replaceAll("\\", "/");
};

/**
 * Normalize relative path to use forward slashes and make it relative to basePath
 */
export const normalizeRelativePath = (
  filePath: string,
  basePath: string
): string => {
  const relativePath = relative(basePath, filePath);
  return "./" + relativePath.replace(/\\/g, "/");
};

/**
 * Resolve module path and normalize it
 */
export const resolveModulePath = (
  moduleSpecifier: string,
  currentFilePath: string,
  searchPath: string
): string => {
  if (moduleSpecifier.startsWith(".")) {
    // Relative import - resolve it relative to the current file
    const currentFileDir = dirname(currentFilePath);
    const resolvedPath = resolve(currentFileDir, moduleSpecifier);

    // Add .ts extension if not present and file exists, otherwise try other extensions
    let finalPath = resolvedPath;
    if (!extname(resolvedPath)) {
      finalPath = resolvedPath + ".ts";
    }

    // Make it relative to searchPath and normalize
    return normalizeRelativePath(finalPath, searchPath);
  }
  // External module - return as is but normalized
  return moduleSpecifier.replace(/\\/g, "/");
};

