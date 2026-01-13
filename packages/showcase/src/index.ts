import { registryProperty } from "@genexus/chameleon-controls-library/dist/collection";
import { defineCustomElements } from "@genexus/chameleon-controls-library/loader";
import { getImagePathCallbackDefinitions } from "@genexus/mercury/assets-manager.js";
import { registerMercury } from "@genexus/mercury/register-mercury.js";
import "./components/layout/layout.lit";

registerMercury();
registryProperty("getImagePathCallback", getImagePathCallbackDefinitions);

defineCustomElements();

