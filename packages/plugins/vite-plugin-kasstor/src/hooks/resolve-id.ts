import {
  RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID,
  RESOLVED_VIRTUAL_CLIENT_MODULE_ID,
  VIRTUAL_CLIENT_HANDLERS_MODULE_ID,
  VIRTUAL_CLIENT_MODULE_ID
} from "../constants.js";

/**
 * Resolve the virtual module ID.
 *
 * Only applies in dev server.
 */
export const resolveId = (id: string, isDevServer: boolean) => {
  // Only works for dev server
  if (!isDevServer) {
    return null;
  }

  if (id === VIRTUAL_CLIENT_MODULE_ID) {
    return RESOLVED_VIRTUAL_CLIENT_MODULE_ID;
  }
  if (id === VIRTUAL_CLIENT_HANDLERS_MODULE_ID) {
    return RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID;
  }
  return null;
};

