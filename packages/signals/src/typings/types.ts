/* eslint-disable @typescript-eslint/no-explicit-any */
import type { computed, signal } from "alien-signals";

export type KasstorSignal<T = any> =
  | KasstorSignalState<T>
  | KasstorSignalComputed<T>;

export type KasstorSignalState<T = any> = ReturnType<typeof signal<T>>;
export type KasstorSignalComputed<T = any> = ReturnType<typeof computed<T>>;
