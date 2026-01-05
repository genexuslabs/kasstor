import {
  RESOLVED_VIRTUAL_HMR_HANDLERS_MODULE_ID,
  RESOLVED_VIRTUAL_HMR_MANAGER_MODULE_ID
} from "../constants.js";

/**
 * Load the virtual module with client-side HMR code.
 *
 * Only applies in dev server.
 */
export const load = (options: {
  isDevServer: boolean;
  id: string;
  hmrManagerCode: string;
  hmrHandlersCode: string;
}) => {
  const { isDevServer, id, hmrManagerCode, hmrHandlersCode } = options;

  // Only works for dev server
  if (!isDevServer) {
    return null;
  }

  if (id === RESOLVED_VIRTUAL_HMR_MANAGER_MODULE_ID) {
    return hmrManagerCode;
  }

  if (id === RESOLVED_VIRTUAL_HMR_HANDLERS_MODULE_ID) {
    return hmrHandlersCode;
  }

  return null;
};
