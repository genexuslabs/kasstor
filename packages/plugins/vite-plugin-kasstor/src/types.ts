/**
 * Options for the Kasstor Vite plugin
 */
export interface KasstorPluginOptions {
  /**
   * Regular expression to match Lit component files.
   * Files matching this pattern will trigger the refresh callback.
   * @example /\.lit\.ts$/
   */
  componentFilePattern?: RegExp;

  debug?: boolean;

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
   * Known limitations for HMR in components:
   *   - The state of the render is destroyed and reconstructed during HMR.
   *   - The `willUpdate` method is not properly updated on components when HMR is enabled.
   */
  hmr?:
    | boolean
    | {
        component?: boolean;
        styles?: boolean;
      };

  insights?:
    | boolean
    | "dev-only"
    | "always"
    | {
        accessibility: boolean | "dev-only" | "always";
        performance: boolean | "dev-only" | "always";
      };

  /**
   * Regular expression to match SCSS files for Lit components.
   * Defaults to /\.scss$/ if not provided.
   */
  scssFilePattern?: RegExp;
}

