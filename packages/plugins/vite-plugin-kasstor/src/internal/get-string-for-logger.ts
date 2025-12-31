import { styleText } from "util";
import { prettyTimeMark } from "./pretty-time-mark.js";

export const getStringForLogger = (
  operationType: string,
  components: string[],
  elapsedTime: number
) =>
  styleText("dim", "[kasstor] ") +
  `updated ${operationType}: ` +
  styleText("cyan", components.join(", ")) +
  styleText("dim", ` in ${prettyTimeMark(elapsedTime)}`);

