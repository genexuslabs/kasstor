import {
  getDesignSystemLoaders,
  getDesignSystemRegistry
} from "./internal/get-design-system-registry";
import { THEME_NAME_TO_PROMISE_MAPPING, THEME_NAME_TO_STYLE_SHEET_MAPPING } from "./internal/store";

/**
 * Clears every piece of global state held by the design system: registered
 * design systems, bundle loaders, cached stylesheets, and in-flight theme
 * promises.
 *
 * Primarily intended for test isolation and for advanced scenarios where the
 * host wants to fully reset the runtime (e.g., HMR boundary refresh). Calling
 * this while themes are in-flight will cancel any pending waiters that
 * resolve through the registry.
 */
export const clearDesignSystemState = () => {
  THEME_NAME_TO_STYLE_SHEET_MAPPING.clear();
  THEME_NAME_TO_PROMISE_MAPPING.clear();
  getDesignSystemRegistry().clear();
  getDesignSystemLoaders().clear();
};

