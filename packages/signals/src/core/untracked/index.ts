import { setActiveSub } from "alien-signals";

/**
 * Access the value of several signals without subscribing to them.
 */
export const untracked = <T>(fn: () => T) => {
  const sub = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(sub);
  }
};
