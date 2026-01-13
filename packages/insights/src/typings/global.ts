import type { PerformanceScanRenderedItems } from "../components/performance-scan/types";

declare global {
  /**
   * Tracks the incoming updates for custom element, so re-renders for
   * components are visually highlighted.
   */
  var kasstorInsightsUpdatedCustomElements:
    | PerformanceScanRenderedItems
    | undefined;

  /**
   * Callback that is called by the monkey patch to the Lit updates, so we can
   * notify re-renders on components.
   */
  var kasstorInsightsUpdateCallback: (() => void) | undefined;
}

// Necessary to auto-detect this module in the project
export type {};
