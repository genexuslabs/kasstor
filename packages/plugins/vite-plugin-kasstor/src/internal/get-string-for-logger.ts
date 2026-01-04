import { styleText } from "util";
import { prettyTimeMark } from "./pretty-time-mark.js";

let lastUpdateTime = performance.now();

const ADD_END_LINE_DEBOUNCE = 1500;

const kasstorPrefix = styleText("dim", "[kasstor] ");
const threeDots = styleText("dim", " ...");

let buildingLibrary = false;

const printElapsedTime = (elapsedTime: number) =>
  styleText("dim", ` in ${prettyTimeMark(elapsedTime)}`);

export const setBuildingLibraryState = (type: "start" | "end") => {
  buildingLibrary = type === "start";
};

export const isBuildingLibrary = () => buildingLibrary;

export const getNormalCommandForLogger = (
  type: "start" | "end",
  message: string,
  elapsedTime = 0
) =>
  (type === "start" ? "\n" : "") +
  kasstorPrefix +
  message +
  (type === "end" ? printElapsedTime(elapsedTime) : threeDots);

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

