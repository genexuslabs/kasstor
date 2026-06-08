import type { KasstorBuildOptions } from "../typings/build-options.js";

export type FrameworkExportTypesKey =
  | "exportTypesForReact"
  | "exportTypesForSolidJs"
  | "exportTypesForStencil";

/**
 * Resolves the configured file name (or `false`) for a per-framework JSX types
 * file.
 *
 * The option value can be:
 *   - `undefined` — use `enabledByDefault` to decide, with `defaultFileName`.
 *   - `true` — enabled, using `defaultFileName`.
 *   - a string — enabled, using that file name.
 *   - `false` — disabled.
 *
 * The per-framework files re-use the `ComponentProperties` namespace from the
 * core types file, so they cannot be generated unless the core file is too:
 *   - If the option is explicitly set (`true`/string) while the core file is
 *     disabled, that's a misconfiguration and we throw.
 *   - If only the default requested it, we silently yield to the explicit
 *     `exportTypesForTheLibrary: false`.
 *
 * @param fileGeneration - The `fileGeneration` option as provided by the user.
 * @param key - The per-framework option key being resolved.
 * @param defaultFileName - File name used when the option is `true` or when it
 *   is enabled by default without an explicit name.
 * @param enabledByDefault - Whether the framework file is generated when the
 *   option is omitted (React is on by default; SolidJS/StencilJS are opt-in).
 * @param coreTypesEnabled - Whether the core types file is being generated.
 */
export const resolveFrameworkFileName = (
  fileGeneration: KasstorBuildOptions["fileGeneration"],
  key: FrameworkExportTypesKey,
  defaultFileName: string,
  enabledByDefault: boolean,
  coreTypesEnabled: boolean
): string | false => {
  if (fileGeneration === false) {
    return false;
  }

  const requested = fileGeneration?.[key];

  // `undefined` falls back to the per-framework default; otherwise any value
  // other than `false` enables it.
  const enabled = requested === undefined ? enabledByDefault : requested !== false;
  if (!enabled) {
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

  // A string is used verbatim; `true` / the default-on case use the default name.
  return typeof requested === "string" ? requested : defaultFileName;
};
