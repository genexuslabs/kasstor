import { DEV_MODE } from "../../development-flags";

/**
 * Promise that resolves when all updates for the current frame are done.
 */
let updatesForTheCurrentFrame: Promise<void> | undefined;

let updatesAtTheSameTime = 0;

/**
 * Threshold for maximum number of updates that can be processed at the same
 * time (in the same frame) before deferring the rest to the next frame.
 *
 * This value is a trade-off between responsiveness and performance. A lower
 * value improves responsiveness but may reduce performance, while a higher value
 * improves performance but may reduce responsiveness.
 *
 * Adjust this value based on the specific needs and performance characteristics,
 * as well as the target devices and browsers.
 *
 * At the time of writing, 1024 updates at the same time seems to be a good
 * balance for most applications.
 *
 * **Always use powers of 2 because of underlying optimizations in JS engines.**
 */
export const MAX_UPDATES_AT_THE_SAME_TIME = 2 ** 10;

/**
 * Returns a Promise that resolves in the next frame if there are too many
 * updates being processed at the same time, or `undefined` if the update can
 * proceed immediately.
 *
 * This function helps to throttle updates to avoid blocking the main thread
 * and thus improve the page's responsiveness.
 */
export const getDelayForUpdate = (): Promise<void> | undefined => {
  updatesAtTheSameTime++;

  if (updatesForTheCurrentFrame === undefined) {
    updatesForTheCurrentFrame = new Promise(resolve => setTimeout(resolve));
  }

  // Decrease the counter when the batch of updates for the current frame is
  // done. In other words, when all components that needed to update in this
  // frame have finished updating.
  updatesForTheCurrentFrame.then(() => {
    updatesAtTheSameTime--;

    if (updatesAtTheSameTime === 0) {
      // console.log("BATCH FINISHED.....................");

      // Free the memory
      updatesForTheCurrentFrame = undefined;
    }
  });

  // Print a warning only once when the threshold is exceeded
  if (DEV_MODE && updatesAtTheSameTime === MAX_UPDATES_AT_THE_SAME_TIME + 1) {
    console.warn(
      `[Kasstor] Detected more than ${MAX_UPDATES_AT_THE_SAME_TIME} simultaneous updates, so the following updates will be throttled to avoid blocking the main thread and thus improve the page's responsiveness. Once the updates are finished, the normal update flow will be restored.`
    );
  }

  // No delay needed
  if (updatesAtTheSameTime <= MAX_UPDATES_AT_THE_SAME_TIME) {
    return undefined;
  }

  return updatesForTheCurrentFrame;
};

