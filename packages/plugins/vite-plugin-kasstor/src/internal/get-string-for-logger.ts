import { platform } from "os";
import { styleText } from "util";
import { prettyTimeMark } from "./pretty-time-mark.js";

let lastUpdateTime = performance.now();

const ADD_END_LINE_DEBOUNCE = 1500;

const isWindowsOs = platform() === "win32";
const dimColor = isWindowsOs ? "gray" : "dim";

const kasstorPrefix = styleText(dimColor, "[kasstor] ");
const threeDots = styleText(dimColor, " ...");

let buildingLibrary = false;

const printElapsedTime = (elapsedTime: number) =>
  styleText(dimColor, ` in ${prettyTimeMark(elapsedTime)}`);

export const setBuildingLibraryState = (type: "start" | "end") => {
  buildingLibrary = type === "start";
};

export const isBuildingLibrary = () => buildingLibrary;

export const getNormalCommandForLogger = (
  type: "start" | "end",
  message: string,
  elapsedTime = 0
) => {
  lastUpdateTime = performance.now();

  return (
    (type === "start" ? "\n" : "") +
    kasstorPrefix +
    message +
    (type === "end" ? printElapsedTime(elapsedTime) : threeDots)
  );
};

export const getUpdatedCommandForLogger = (
  operationType: "global types" | "readme" | "component" | "style",
  components: string[],
  elapsedTime: number
) => {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  lastUpdateTime = now;

  return (
    (!buildingLibrary && timeSinceLastUpdate > ADD_END_LINE_DEBOUNCE
      ? "\n"
      : "") +
    kasstorPrefix +
    `updated ${operationType}: ` +
    styleText("cyan", components.join(", ")) +
    printElapsedTime(elapsedTime)
  );
};
