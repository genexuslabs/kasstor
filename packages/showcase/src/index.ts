import { registryProperty } from "@genexus/chameleon-controls-library/dist/collection";
import { defineCustomElements } from "@genexus/chameleon-controls-library/loader";
import { getImagePathCallbackDefinitions } from "@genexus/mercury/assets-manager.js";
import { registerMercury } from "@genexus/mercury/register-mercury.js";
import "./components/layout/layout.lit";

// Define the callback for Lit component hot refresh
// This callback is invoked by the vite-plugin-lit-refresh when a .lit.ts or .scss file changes
interface LitRefreshData {
  file: string;
  fileType: "component" | "scss" | "unknown";
  timestamp: number;
}

(
  window as unknown as { onLitComponentRefresh: (data: LitRefreshData) => void }
).onLitComponentRefresh = (data: LitRefreshData) => {
  console.log(`[Lit Refresh] File changed:`, data);

  // TODO: Implement your hot refresh logic here
  // For example, you could re-render components or update styles
};

registerMercury();
registryProperty("getImagePathCallback", getImagePathCallbackDefinitions);

defineCustomElements();

