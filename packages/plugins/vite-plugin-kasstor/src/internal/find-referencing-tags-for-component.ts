import { readFile } from "fs/promises";
import type { ViteDevServer } from "vite";

import { extractTagNameFromSource } from "./extract-tag-name-from-source.js";

/**
 * Given a component file absolute path and the dev server, return all component tag names
 * that (directly or indirectly) import that component file by inspecting the module graph
 * and parsing component module sources to extract the tag name.
 */
export const findReferencingTagsForComponent = async (options: {
  componentDecoratorRegex: RegExp;
  componentPath: string;
  server: ViteDevServer;
}): Promise<string[]> => {
  const { componentDecoratorRegex, componentPath, server } = options;

  // For component files, extract the tag name from the source
  try {
    const source = await readFile(componentPath, "utf-8");

    const tag = extractTagNameFromSource(source, componentDecoratorRegex);

    if (tag !== null) {
      return [tag];
    }
  } catch (e) {
    server.config.logger.warn(
      `[kasstor] Could not extract tag from ${componentPath}: ${e}`
    );
  }

  return [];
};

