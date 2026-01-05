// HMR manager
export const VIRTUAL_HMR_MANAGER_MODULE_ID = "virtual:kasstor-hmr-manager";
export const RESOLVED_VIRTUAL_HMR_MANAGER_MODULE_ID =
  "\0" + VIRTUAL_HMR_MANAGER_MODULE_ID;

// HMR handlers
export const VIRTUAL_HMR_HANDLERS_MODULE_ID = "virtual:kasstor-hmr-handlers";
export const RESOLVED_VIRTUAL_HMR_HANDLERS_MODULE_ID =
  "\0" + VIRTUAL_HMR_HANDLERS_MODULE_ID;

export const DEFAULT_COMPONENT_FILE_PATTERN = /\.lit\.(ts|js)$/;
export const DEFAULT_SCSS_FILE_PATTERN = /(\.scss|\.scss\.js)$/;

export const DEFINE_CUSTOM_ELEMENT_REGEX =
  /customElements\.define\s*\(\s*["']([^"']+)["']/m;

export const COMPONENT_TAG_NAME_FOR_TRANSPILED_JS_REGEX =
  /Component\s*\(\s*\{[\s\S]*?tag\s*:\s*["']([^"']+)["']/m;

export const COMPONENT_TAG_NAME_FOR_MINIFIED_JS_REGEX =
  /\b[a-zA-Z0-9_]+\s*\(\{[^}]*\btag:\s*"([^"]+)"[^}]*\}\)/m;

export const LIBRARY_ANALYSIS_MESSAGES = {
  START: "library analysis started",
  FINISH: "library analysis finished",
  EXPORTED_TYPES: "updated exported types"
} as const;

export const HMR_WS_EVENT_NAME = "kasstor:hmr-update";
export const PERFORMANCE_METRIC_WS_EVENT_NAME = "kasstor:performance-metric";
