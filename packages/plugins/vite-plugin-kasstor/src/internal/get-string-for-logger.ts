import { styleText } from "util";
import { prettyTimeMark } from "./pretty-time-mark.js";

let lastUpdateTime = performance.now();

const ADD_END_LINE_DEBOUNCE = 1500;

export const getStringForLogger = (
  operationType: string,
  components: string[],
  elapsedTime: number
) => {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  lastUpdateTime = now;

  return (
    (timeSinceLastUpdate > ADD_END_LINE_DEBOUNCE ? "\n" : "") +
    styleText("dim", "[kasstor] ") +
    `updated ${operationType}: ` +
    styleText("cyan", components.join(", ")) +
    styleText("dim", ` in ${prettyTimeMark(elapsedTime)}`)
  );
};

