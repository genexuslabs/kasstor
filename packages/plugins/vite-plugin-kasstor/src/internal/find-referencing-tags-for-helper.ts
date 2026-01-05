import { readFile } from "fs/promises";
import type { ModuleNode, ViteDevServer } from "vite";

import { extractTagNameFromSource } from "./extract-tag-name-from-source.js";
import { findReferencingComponentModules } from "./find-referencing-component-modules.js";
import { moduleNodeToFilePath } from "./module-node-to-file-path.js";
import { normalizeExternalFilePaths } from "./normalize-external-file-paths.js";

export interface ComponentReference {
  tag: string;
  path: string;
}

/**
 * Given a helper file absolute path and the dev server, return all component references
 * (tag names and file paths) that (directly or indirectly) import that helper file by
 * inspecting the module graph and parsing component module sources to extract the tag name.
 *
 * This function walks up the importer chain to find all components that use this helper,
 * including transitive imports (e.g., helper -> utility -> component).
 */
export const findReferencingTagsForHelper = async (options: {
  componentDecoratorRegex: RegExp;
  includedComponentPaths: RegExp[];
  helperPath: string;
  server: ViteDevServer;
}): Promise<ComponentReference[]> => {
  const {
    componentDecoratorRegex,
    includedComponentPaths,
    helperPath,
    server
  } = options;

  // Try to get the module node for the helper path
  // The module id in the graph is often the absolute file path or '/@fs/abs/path'
  let node = server.moduleGraph.getModuleById(helperPath) as
    | ModuleNode
    | null
    | undefined;

  // try with /@fs/ prefix
  node ??= server.moduleGraph.getModuleById(`/@fs/${helperPath}`) as
    | ModuleNode
    | null
    | undefined;

  if (!node) {
    // try to search all modules and match file
    for (const mod of server.moduleGraph.urlToModuleMap?.values() ?? []) {
      const file = moduleNodeToFilePath(mod as ModuleNode);
      if (file === helperPath) {
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
  const references: ComponentReference[] = [];

  for (const compPath of componentModulePaths) {
    try {
      const code = await readFile(compPath, "utf-8");
      const tag = extractTagNameFromSource(code, componentDecoratorRegex);
      if (tag) {
        references.push({
          tag,
          path: normalizeExternalFilePaths(compPath, server)
        });
      }
    } catch (e) {
      // ignore read errors
      server.config.logger.warn(
        `[kasstor] Could not read module ${compPath}: ${e}`
      );
    }
  }

  return references;
};
