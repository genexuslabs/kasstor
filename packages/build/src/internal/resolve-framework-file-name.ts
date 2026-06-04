import type { KasstorBuildOptions } from "../typings/build-options.js";

export type FrameworkExportTypesKey =
  | "exportTypesForReact"
  | "exportTypesForSolidJs"
  | "exportTypesForStencil";

/**
 * Resolves the configured file name (or `false`) for a per-framework JSX types
 * file.
 *
 * The per-framework files re-use the `ComponentProperties` namespace from the
 * core types file, so they cannot be generated unless the core file is too:
 *   - If the option is explicitly set while the core file is disabled, that's a
 *     misconfiguration and we throw.
 *   - If only the default requested it, we silently yield to the explicit
 *     `exportTypesForTheLibrary: false`.
 *
 * @param fileGeneration - The `fileGeneration` option as provided by the user.
 * @param key - The per-framework option key being resolved.
 * @param defaultValue - The default when the option is omitted (a file name to
 *   generate by default, or `false` to keep it opt-in).
 * @param coreTypesEnabled - Whether the core types file is being generated.
 */
export const resolveFrameworkFileName = (
  fileGeneration: KasstorBuildOptions["fileGeneration"],
  key: FrameworkExportTypesKey,
  defaultValue: string | false,
  coreTypesEnabled: boolean
): string | false => {
  if (fileGeneration === false) {
    return false;
  }

  const requested = fileGeneration?.[key];
  const resolved = requested === undefined ? defaultValue : requested;

  if (resolved === false) {
    return false;
  }

  if (!coreTypesEnabled) {
    if (requested !== undefined) {
      throw new Error(
        `[kasstor] "fileGeneration.${key}" requires "fileGeneration.exportTypesForTheLibrary" to be generated, because the framework types re-use the "ComponentProperties" namespace from that file. Enable the core types file or set "fileGeneration.${key}" to false.`
      );
    }

    return false;
  }

  return resolved;
};
