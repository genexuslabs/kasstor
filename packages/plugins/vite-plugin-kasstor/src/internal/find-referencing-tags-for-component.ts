import { readFile } from "fs/promises";
import type { ViteDevServer } from "vite";

/**
 * Given a component file absolute path and the dev server, return all component tag names
 * that (directly or indirectly) import that component file by inspecting the module graph
 * and parsing component module sources to extract the tag name.
 */
export const findReferencingTagsForComponent = async (options: {
  componentPath: string;
  server: ViteDevServer;
}): Promise<string[]> => {
  const { componentPath, server } = options;

  // For component files, extract the tag name from the source
  try {
    const source = await readFile(componentPath, "utf-8");

    // Extract tag name using regex patterns
    const COMPONENT_DECORATOR_REGEX =
      /@Component\s*\(\s*\{[\s\S]*?tag\s*:\s*["']([^"']+)["']/m;
    const DEFINE_CUSTOM_ELEMENT_REGEX =
      /customElements\.define\s*\(\s*["']([^"']+)["']/m;

    const compMatch = source.match(COMPONENT_DECORATOR_REGEX);
    const tag = compMatch ? compMatch[1] : null;

    if (!tag) {
      const defineMatch = source.match(DEFINE_CUSTOM_ELEMENT_REGEX);
      if (defineMatch) {
        return [defineMatch[1]];
      }
    } else {
      return [tag];
    }
  } catch (e) {
    server.config.logger.warn(
      `[kasstor] Could not extract tag from ${componentPath}: ${e}`
    );
  }

  return [];
};

