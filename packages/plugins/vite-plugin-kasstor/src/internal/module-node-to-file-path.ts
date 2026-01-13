import type { ModuleNode } from "vite";

/**
 * Given a module node, returns its absolute file path if possible
 */
export const moduleNodeToFilePath = (
  node?: ModuleNode | null
): string | null => {
  if (!node) {
    return null;
  }
  if (node.file) {
    return node.file;
  }
  if (node.id && node.id.startsWith("/@fs/")) {
    return node.id.replace("/@fs/", "");
  }
  if (node.id && node.id.startsWith("file://")) {
    return node.id.replace("file://", "");
  }
  return node.id ?? null;
};
