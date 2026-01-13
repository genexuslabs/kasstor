import { join, posix, relative } from "path";
import { normalizePath, type ViteDevServer } from "vite";

/**
 * If the file is outside the project root (e.g., in node_modules), it needs to
 * be normalized with the @fs/ prefix so Vite serves it from the filesystem.
 *
 * This way, we avoid displaying the "Not allowed to load local resource" error
 * message in the browser
 *
 */
export const normalizeExternalFilePaths = (
  filePath: string,
  server: ViteDevServer
) => {
  // Normalize the file path
  // Check if the file is within the project root
  const relativePath = relative(server.config.root, filePath);
  const isFileOutsideRoot = relativePath.startsWith("..");

  // If the file is outside the project root (e.g., in node_modules),
  // use the @fs/ prefix so Vite serves it from the filesystem
  return normalizePath(
    isFileOutsideRoot ? join("/@fs", filePath) : posix.join("/", relativePath)
  );
};
