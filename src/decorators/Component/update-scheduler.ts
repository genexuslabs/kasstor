// import { DEV_MODE } from "../../development-flags";

const updateDelayTimeout = () =>
  new Promise<void>(resolve => setTimeout(resolve));

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
 * At the time of writing, **1024** updates at the same time seems to be a good
 * balance for most applications.
 *
 * **Always use powers of 2 because of underlying optimizations in JS engines.**
 */
export const MAX_UPDATES_AT_THE_SAME_TIME = 2 ** 10; // 1024

/**
 * Weight of initial renders compared to subsequent renders when counting
 * updates in a frame.
 *
 * Initial renders are more expensive than subsequent renders, because they
 * involve creating and inserting new DOM elements, applying styles, and
 * setting up event listeners. Subsequent renders typically only involve
 * updating existing DOM elements.
 */
const INITIAL_RENDER_WEIGHT = 4;

/**
 * Weight of subsequent renders when counting updates in a frame.
 *
 * Subsequent renders are less expensive than initial renders, so they
 * have a lower weight.
 */
const SUBSEQUENT_RENDER_WEIGHT = 1;

/**
 * List of batches of updates being processed in each frame.
 */
export const updatesInEachBatch: {
  /**
   * Returns a promise that is resolved when all updates in this batch are done.
   */
  batchComplete: Promise<void>;

  /**
   * Number of updates in this batch. At maximum `MAX_UPDATES_AT_THE_SAME_TIME`.
   */
  updatesCount: number;
}[] = [];

/**
 * Returns `true` if a new frame batch must be created to partition the updates.
 */
const mustAddANewFrameBatch = (): boolean => {
  const lastFrameBatch = updatesInEachBatch.at(-1);

  return (
    lastFrameBatch === undefined ||
    lastFrameBatch.updatesCount >= MAX_UPDATES_AT_THE_SAME_TIME
  );
};

/**
 * Adds a new frame batch to partition the updates and removes the batch when
 * done.
 */
const addNewFrameBatch = () => {
  const lastFrameBatchUpdateComplete = getLastFrameBatchUpdateFinalization();

  // The finalization of the updates for this frame must wait for the previous
  // frames to be finalized first, to ensure the correct order of updates.
  const batchComplete = lastFrameBatchUpdateComplete
    ? lastFrameBatchUpdateComplete.finally(updateDelayTimeout)
    : // First batch, no need to wait, otherwise the second element of the array
      // would have to wait two frames
      Promise.resolve(); // TODO: Should we use undefined here?

  updatesInEachBatch.push({ batchComplete, updatesCount: 0 });

  // Remove the batch from the list to free memory, once the updates for the
  // frame are done
  batchComplete.finally(() => updatesInEachBatch.shift());
};

export const getLastFrameBatchUpdateFinalization = ():
  | Promise<void>
  | undefined => updatesInEachBatch.at(-1)?.batchComplete;

/**
 * Adds an update to the last frame batch, creating a new batch if needed.
 * @param hasUpdated `true` if the component has already been updated at least once.
 */
const addUpdateInLastFrameBatch = (hasUpdated: boolean) => {
  if (mustAddANewFrameBatch()) {
    addNewFrameBatch();

    // Print a warning only once when the threshold is exceeded
    // if (DEV_MODE && updatesInEachBatch.length === 2) {
    //   console.warn(
    //     `[Kasstor] Detected more than ${MAX_UPDATES_AT_THE_SAME_TIME} simultaneous updates, so the following updates will be throttled to avoid blocking the main thread and thus improve the page's responsiveness. Once the updates are finished, the normal update flow will be restored.`
    //   );
    // }
  }

  // Increase the counter of updates in the last frame batch
  updatesInEachBatch.at(-1)!.updatesCount += hasUpdated
    ? SUBSEQUENT_RENDER_WEIGHT
    : INITIAL_RENDER_WEIGHT;
};

/**
 * Returns a Promise that resolves in the next frame if there are too many
 * updates being processed at the same time, or `undefined` if the update can
 * proceed immediately.
 *
 * This function helps to throttle updates to avoid blocking the main thread
 * and thus improve the page's responsiveness.
 *
 * @param hasUpdated `true` if the component has already been updated at least once.
 */
export const getDelayForUpdate = (
  hasUpdated: boolean
): Promise<void> | undefined => {
  addUpdateInLastFrameBatch(hasUpdated);

  return updatesInEachBatch.length === 1
    ? // No delay needed when there is only one batch, as it is processed in
      // the current frame
      undefined
    : getLastFrameBatchUpdateFinalization();
};
