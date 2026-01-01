import {
  RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID,
  RESOLVED_VIRTUAL_CLIENT_MODULE_ID
} from "../constants.js";

/**
 * Load the virtual module with client-side HMR code.
 *
 * Only applies in dev server.
 */
export const load = (options: {
  isDevServer: boolean;
  id: string;
  getClientCode: string;
  getClientHandlerModule: string;
}) => {
  const { isDevServer, id, getClientCode, getClientHandlerModule } = options;

  // Only works for dev server
  if (!isDevServer) {
    return null;
  }

  if (id === RESOLVED_VIRTUAL_CLIENT_MODULE_ID) {
    return getClientCode;
  }
  if (id === RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID) {
    return getClientHandlerModule;
  }
  return null;
};

