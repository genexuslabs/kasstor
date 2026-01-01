import { readFile } from "fs/promises";
import type { ModuleNode, ViteDevServer } from "vite";

import { extractTagNameFromSource } from "./extract-tag-name-from-source.js";
import { findReferencingComponentModules } from "./find-referencing-component-modules.js";
import { moduleNodeToFilePath } from "./module-node-to-file-path.js";

/**
 * Given a scss file absolute path and the dev server, return all component tag names
 * that (directly or indirectly) import that scss file by inspecting the module graph
 * and parsing component module sources to extract the tag name.
 */
export const findReferencingTagsForScss = async (options: {
  includedComponentPaths: RegExp[];
  scssPath: string;
  server: ViteDevServer;
}): Promise<string[]> => {
  const { includedComponentPaths, scssPath, server } = options;

  // Try to get the module node for the scss path
  // The module id in the graph is often the absolute file path or '/@fs/abs/path'
  let node = server.moduleGraph.getModuleById(scssPath) as
    | ModuleNode
    | null
    | undefined;

  // try with /@fs/ prefix
  node ??= server.moduleGraph.getModuleById(`/@fs/${scssPath}`) as
    | ModuleNode
    | null
    | undefined;

  if (!node) {
    // try to search all modules and match file
    for (const mod of server.moduleGraph.urlToModuleMap?.values() ?? []) {
      const file = moduleNodeToFilePath(mod as ModuleNode);
      if (file === scssPath) {
        node = mod as ModuleNode;
        break;
      }
    }
  }

  if (!node) {
    return [];
  }

  const componentModulePaths = findReferencingComponentModules(
    node,
    includedComponentPaths
  );
  const tags = new Set<string>();

  for (const compPath of componentModulePaths) {
    try {
      const code = await readFile(compPath, "utf-8");
      const tag = extractTagNameFromSource(code);
      if (tag) {
        tags.add(tag);
      }
    } catch (e) {
      // ignore read errors
      server.config.logger.warn(
        `[kasstor] Could not read module ${compPath}: ${e}`
      );
    }
  }

  return Array.from(tags);
};

