import type { ModuleNode } from "vite";
import { moduleNodeToFilePath } from "./module-node-to-file-path.js";

/**
 * Walk up the importer graph to find all modules that match includedComponentPaths.
 * Returns an array of module file paths (absolute) for component modules.
 */
export const findReferencingComponentModules = (
  startNode: ModuleNode | null,
  includedComponentPaths: RegExp[]
): string[] => {
  if (!startNode) {
    return [];
  }
  const visited = new Set<ModuleNode>();
  const queue: ModuleNode[] = [startNode];
  const result = new Set<string>();

  while (queue.length) {
    const node = queue.shift();
    if (!node || visited.has(node)) {
      continue;
    }
    visited.add(node);

    // If this node represents a component module, record it
    const filePath = moduleNodeToFilePath(node);

    if (
      filePath &&
      includedComponentPaths.some(pattern => pattern.test(filePath))
    ) {
      result.add(filePath);
      // do not need to traverse its importers further for this path
    } else {
      // otherwise enqueue importers
      const importers = node.importers ?? new Set();
      for (const importer of importers) {
        if (!visited.has(importer)) {
          queue.push(importer);
        }
      }
    }
  }

  return Array.from(result);
};

