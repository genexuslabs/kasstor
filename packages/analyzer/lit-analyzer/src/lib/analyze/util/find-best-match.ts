import type { Omit } from "./general-util.js";

export interface FindBestMatchOptions<T> {
  threshold?: number;
  caseSensitive?: boolean;
  matchKey: keyof T;
}

/**
 * Returns the element from `elements` whose `matchKey` is most similar to
 * `find`, or `undefined` when nothing crosses the similarity threshold.
 *
 * Replaces the `didyoumean2` dependency with a small Levenshtein-based
 * matcher. The algorithm and threshold semantics match `didyoumean2`'s
 * `FIRST_CLOSEST_MATCH` mode so existing tests/snapshots stay green.
 */
export function findBestMatch<T extends string | object>(
  find: string,
  elements: T[],
  options: FindBestMatchOptions<T>
): T | undefined {
  const caseSensitive = options.caseSensitive ?? false;
  const threshold = options.threshold ?? 0.5;
  const key = options.matchKey;

  let best: T | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  const findCmp = caseSensitive ? find : find.toLowerCase();
  const findLen = findCmp.length;

  const len = elements.length;
  for (let i = 0; i < len; i++) {
    const el = elements[i]!;
    const raw = (typeof el === "string" ? el : (el as Record<string, unknown>)[key as string]) as
      | string
      | undefined;
    if (typeof raw !== "string") continue;
    const candidate = caseSensitive ? raw : raw.toLowerCase();

    // Threshold short-circuit: if length difference alone exceeds the
    // similarity budget there is no chance of matching.
    const maxLen = Math.max(findLen, candidate.length);
    if (maxLen === 0) continue;
    const budget = Math.floor(maxLen * threshold);
    if (Math.abs(findLen - candidate.length) > budget) continue;

    const dist = levenshtein(findCmp, candidate, bestDistance);
    if (dist > budget) continue;
    if (dist < bestDistance) {
      bestDistance = dist;
      best = el;
    }
  }

  return best;
}

export function findBestStringMatch(
  find: string,
  elements: string[],
  { caseSensitive = true, threshold = 0.5 }: Omit<FindBestMatchOptions<string>, "matchKey"> = {}
): string | undefined {
  return findBestMatch(find, elements, { caseSensitive, threshold, matchKey: "" as never });
}

/**
 * Iterative two-row Levenshtein distance with an early-exit cap. Returns a
 * value greater than `cap` whenever the true distance exceeds `cap`,
 * letting callers prune candidates that have already been beaten.
 *
 * Two `Uint16Array` rows are sufficient for any string we'll see (HTML
 * attribute / event / CSS-property names — well under 64k characters).
 * Reusing typed arrays avoids per-call GC pressure.
 */
const SCRATCH_PREV = new Uint16Array(256);
const SCRATCH_CURR = new Uint16Array(256);

function levenshtein(a: string, b: string, cap: number): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  if (a === b) return 0;

  // Resize scratch buffers if needed (rare — most names are <= 64 chars).
  const required = bLen + 1;
  let prev = SCRATCH_PREV;
  let curr = SCRATCH_CURR;
  if (required > prev.length) {
    prev = new Uint16Array(required);
    curr = new Uint16Array(required);
  }

  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);
    let rowMin = curr[0]!;

    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j]! + 1;
      const ins = curr[j - 1]! + 1;
      const sub = prev[j - 1]! + cost;
      const min = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub;
      curr[j] = min;
      if (min < rowMin) rowMin = min;
    }

    // Early exit: every cell on the next iteration is at least rowMin, so
    // if the entire row is already worse than `cap` we can bail.
    if (rowMin > cap) return rowMin;

    // Swap rows.
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[bLen]!;
}
