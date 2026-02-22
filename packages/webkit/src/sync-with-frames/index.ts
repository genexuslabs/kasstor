/**
 * Schedules work to run on the next animation frame. Batches multiple calls
 * so that only one frame callback runs: the first call schedules the frame;
 * further calls before the frame fires only run the optional immediate callback.
 *
 * Use for scroll handlers, resize, or other high-frequency updates where you
 * want to coalesce updates to the next paint.
 */
export class SyncWithRAF {
  #needForRAF = true; // To prevent redundant RAF (request animation frame) calls
  #computationId: number | undefined;

  /**
   * Runs a computation on the next animation frame. Optionally runs another
   * computation immediately on each call (e.g. to capture scroll position).
   *
   * @param computationInFrame - Callback run once on the next frame.
   * @param computationBeforeFrame - Optional callback run synchronously on
   *   every call; not deferred to the frame.
   *
   * Behavior:
   * - If called multiple times before the next frame, only the first
   *   `computationInFrame` is scheduled; it runs once in the frame.
   * - `computationBeforeFrame` runs on every call, before scheduling.
   * - Use `cancel()` to cancel the scheduled frame work.
   */
  perform(computationInFrame: () => void, computationBeforeFrame?: () => void): void {
    if (computationBeforeFrame) {
      computationBeforeFrame();
    }

    if (!this.#needForRAF) {
      return;
    }
    this.#needForRAF = false; // No need to call RAF up until next frame

    this.#computationId = requestAnimationFrame(() => {
      this.#needForRAF = true; // RAF now consumes the movement instruction so a new one can come

      computationInFrame();
    });
  }

  /**
   * Cancels the computation queued for the next frame, if any.
   *
   * Behavior:
   * - No-op if nothing was queued.
   * - After cancel, the next `perform()` call will schedule a new frame.
   */
  cancel(): void {
    if (this.#computationId) {
      cancelAnimationFrame(this.#computationId);
    }

    this.#needForRAF = true;
  }
}
