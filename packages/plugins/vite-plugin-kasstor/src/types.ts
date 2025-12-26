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
