import { sync } from "oxc-resolver";
import { join } from "path";
import { VIRTUAL_HMR_MANAGER_MODULE_ID } from "../constants.js";

let performanceInsightsSpecifierPath: string | undefined;

const hmrScript = {
  tag: "script",
  attrs: {
    type: "module",
    src: `/@id/__x00__${VIRTUAL_HMR_MANAGER_MODULE_ID}`
  },
  injectTo: "head"
} as const;

const performanceScanTag = {
  tag: "kst-performance-scan",
  injectTo: "body"
} as const;

const getPerformanceInsightsSpecifierPath = () => {
  if (performanceInsightsSpecifierPath !== undefined) {
    return performanceInsightsSpecifierPath;
  }

  // TODO: We should try to use the built in utilities of Vite to find the
  // module specifier
  // First, resolve the path where @genexus/kasstor-insights/components/performance-scan.js is installed
  const resolution = sync(
    process.cwd(),
    "@genexus/kasstor-insights/components/performance-scan.js"
  );
  performanceInsightsSpecifierPath = resolution?.path;

  if (!performanceInsightsSpecifierPath) {
    throw new Error(
      "@genexus/kasstor-insights dependency was not found. Validate that @genexus/kasstor-insights is installed."
    );
  }

  return performanceInsightsSpecifierPath;
};

const performanceInsightsScript = () =>
  ({
    tag: "script",
    attrs: {
      type: "module",
      src: join("@fs", getPerformanceInsightsSpecifierPath())
    },
    injectTo: "head"
  }) as const;

/**
 * Transform the HTML to import our virtual module(s).
 *
 * Only applies in dev server.
 */
export const transformIndexHtml = async (options: {
  isDevServer: boolean;
  performanceInsights: boolean;
}) => {
  const { isDevServer, performanceInsights } = options;

  // Only works for dev server
  if (!isDevServer) {
    return undefined;
  }

  return performanceInsights
    ? [performanceInsightsScript(), performanceScanTag, hmrScript]
    : [hmrScript];
};
