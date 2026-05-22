import { getDesignSystemLoaders } from "./internal/get-design-system-registry";

/**
 * Get the URL of the style sheet for the given name.
 *
 * @param name - The name of the style sheet.
 *
 * @returns The URL of the style sheet.
 */
export const getStyleSheetUrl = (name: string) => getDesignSystemLoaders().get(name);

