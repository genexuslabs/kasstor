import type { KasstorBuildOptions } from "@genexus/kasstor-build";

/**
 * Options for the Kasstor Vite plugin
 */
export type KasstorPluginOptions = {
  debug?: boolean;

  /**
   * Paths or patterns to exclude when searching for components or style files.
   *
   * If a path or pattern is specified, components matching these will be
   * excluded from HMR and documentation generation.
   *
   * Exclusions take precedence over inclusions.
   */
  excludedPaths?: RegExp | RegExp[];

  /**
   * Enables or disables Hot Module Replacement (HMR) for components and styles.
   *
   * If `true`, HMR is enabled for both components and styles.
   *
   * When the HMR is enabled for components, private fields (#field) are
   * transformed to public fields (__field), enabling proxy-based HMR for class
   * instances. Without this, HMR for class instances is not possible when they
   * use private fields.
   *
   * ⚠️ Known limitations for HMR in components:
   *   - The state of the render is destroyed and reconstructed during HMR.
   *   - The `willUpdate` method is not properly updated on components when HMR is enabled.
   *
   * ⚠️ Known limitations for HMR in styles:
   *   - Changing transitive scss files does not trigger a refresh in components that import them.
   *     For example, if a component "X" uses a scss file "A" that imports another scss file "B",
   *     changes to "B" will not trigger a style refresh for the component "X".
   */
  hmr?:
    | boolean
    | {
        /**
         * If `true`, HMR is enabled for components.
         */
        component?: boolean;

        /**
         * If `true`, HMR is enabled for styles.
         */
        styles?: boolean;
      };

  /**
   * Paths or patterns to include when searching for components or style files.
   *
   * If a path or pattern is specified, only components matching these will be
   * included in HMR and documentation generation.
   *
   * Exclusions take precedence over inclusions.
   */
  includedPaths?: {
    /**
     * Regular expression to match Lit component files.
     * @default /\.lit\.ts$/
     */
    component: RegExp | RegExp[];

    /**
     * Regular expression to match SCSS files for Lit components.
     * @default /\.scss$/
     */
    styles?: RegExp | RegExp[];
  };

  insights?:
    | boolean
    | "dev-only"
    | "always"
    | {
        accessibility?: boolean;
        performance?: boolean;
      };
} & Pick<
  KasstorBuildOptions,
  | "customComponentDecoratorNames"
  | "defaultComponentAccess"
  | "excludedPublicMethods"
  | "fileGeneration"
>;

