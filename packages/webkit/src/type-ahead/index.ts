const DEFAULT_DELAY = 512; // This is a power of 2, because it provides a faster comparison

const stringHasAllTheSameLetter = (currentQuery: string) => {
  // We don't need to apply toLowerCase(), because we concat the characters
  // with toLowerCase in the currentQuery
  const letter = currentQuery[0];

  // We use "for loop", because it is faster than using currentQuery.split("").every(...)
  for (let index = 1; index < currentQuery.length; index++) {
    const letterToCheck = currentQuery[index].toLowerCase();

    if (letterToCheck !== letter) {
      return false;
    }
  }

  return true;
};

const iterateStartingFromStartIndex = <Index>(
  startIndex: Index,
  stringStartsWithCurrentQuery: (index: Index) => boolean,
  getFirstIndex: () => Index | null,
  getNextItem: (currentIndex: Index) => Index | null,
  isSameIndex: (a: Index, b: Index) => boolean
): Index | null => {
  // We need to check the condition for the first item right away, because the
  // while needs the currentIndex to differ from the startIndex
  if (stringStartsWithCurrentQuery(startIndex)) {
    return startIndex;
  }

  let currentIndex: Index | null = getNextItem(startIndex);

  // Iterate from the startIndex to the end of the structure
  while (currentIndex !== null && !isSameIndex(currentIndex, startIndex)) {
    if (stringStartsWithCurrentQuery(currentIndex)) {
      return currentIndex;
    }
    currentIndex = getNextItem(currentIndex);
  }

  // The getNextItem implementation started from the first item again, so we
  // don't need to start again
  if (currentIndex !== null && isSameIndex(currentIndex, startIndex)) {
    return null;
  }
  currentIndex = getFirstIndex();

  // Iterate from the first index of the structure to the startIndex
  while (currentIndex !== null && !isSameIndex(currentIndex, startIndex)) {
    if (stringStartsWithCurrentQuery(currentIndex)) {
      return currentIndex;
    }
    currentIndex = getNextItem(currentIndex);
  }

  return null;
};

/**
 * Tries to find the `currentQuery` in the array, by performing two types of
 * search:
 *   - First, iterate over the array validating if there is a caption that
 *     startsWith the `currentQuery`.
 *
 *   - If no results are found, check if the `currentQuery` has all the same
 *     letters. If so, find the first option that startsWith the repeated letter.
 *
 *   - If no coincidences, it returns `null`.
 */
const getIndexFromCurrentQuery = <Index>(
  currentQuery: string,
  startIndex: Index,
  getCaptionFromIndex: (index: Index) => string,
  getFirstIndex: () => Index | null,
  getNextIndex: (currentIndex: Index) => Index | null,
  isSameIndex: (a: Index, b: Index) => boolean
): Index | null => {
  const indexWasFound = iterateStartingFromStartIndex(
    startIndex,
    (index: Index) => getCaptionFromIndex(index).toLowerCase().startsWith(currentQuery),
    getFirstIndex,
    getNextIndex,
    isSameIndex
  );

  if (indexWasFound !== null) {
    return indexWasFound;
  }

  // If the same letter is being repeated, cycle through first-letter matches
  // This is the same behavior as the native select
  if (stringHasAllTheSameLetter(currentQuery)) {
    const letter = currentQuery[0];

    return iterateStartingFromStartIndex(
      startIndex,
      (index: Index) => getCaptionFromIndex(index).toLowerCase().startsWith(letter),
      getFirstIndex,
      getNextIndex,
      isSameIndex
    );
  }

  // If no matches, return null
  return null;
};

export class TypeAhead<Index> {
  #currentQuery: string = "";
  #lastSearchTime = 0;

  /**
   * Specifies the time-interval in milliseconds until the previous search
   * query is cleared. The timer is checked against the last call to the
   * `search` method.
   */
  delay: number;

  getCaptionFromIndex: (index: Index) => string;

  getFirstIndex: () => Index | null;

  getNextIndex: (currentIndex: Index) => Index | null;

  isSameIndex: (a: Index, b: Index) => boolean;

  constructor(options: {
    delay?: number;
    getCaptionFromIndex: (index: Index) => string;
    getFirstIndex: () => Index | null;
    getNextIndex: (currentIndex: Index) => Index | null;
    isSameIndex: (a: Index, b: Index) => boolean;
  }) {
    const { delay, getCaptionFromIndex, getFirstIndex, getNextIndex, isSameIndex } = options;

    this.delay = delay ?? DEFAULT_DELAY;
    this.getCaptionFromIndex = getCaptionFromIndex;
    this.getFirstIndex = getFirstIndex;
    this.getNextIndex = getNextIndex;
    this.isSameIndex = isSameIndex;
  }

  /**
   * TODO
   * @param character
   * @param activeItemIndex The current select item index, starting from 0. If
   * `undefined` or a negative value is provided, it means that there is no
   * active item.
   */
  search(character: string, activeItemIndex: Index | undefined): Index | null {
    const { delay, getCaptionFromIndex, getFirstIndex, getNextIndex, isSameIndex } = this;

    const currentTime = performance.now();
    const elapsedTimeFromLastSearch = currentTime - this.#lastSearchTime;
    const shouldResetQuery = elapsedTimeFromLastSearch > delay;

    // We don't use setTimeout and clearTimeout to implement the query reset,
    // because the delay can be changed dynamically. This way allow us to
    // support dynamic delays
    if (shouldResetQuery) {
      this.#currentQuery = "";
    }
    this.#lastSearchTime = currentTime;

    // Apply toLowerCase() in this instance, so we can skip the operation when
    // checking for the same letter
    this.#currentQuery += character.toLowerCase();

    const startIndexToSearch =
      activeItemIndex === undefined ? getFirstIndex() : getNextIndex(activeItemIndex);

    // This case should not occur, but we check it to resolve the type issue
    if (startIndexToSearch === null) {
      return startIndexToSearch;
    }

    const searchIndex = getIndexFromCurrentQuery(
      this.#currentQuery,
      startIndexToSearch,
      getCaptionFromIndex,
      getFirstIndex,
      getNextIndex,
      isSameIndex
    );

    // If no matches, clear the search string and return null
    if (searchIndex === null) {
      this.#currentQuery = "";
    }

    return searchIndex;
  }
}
