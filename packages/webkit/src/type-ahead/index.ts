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

const iterateStartingFromStartIndex = <T>(
  options: T[],
  startIndex: number,
  stringStartsWithCurrentQuery: (option: T) => boolean
): number | null => {
  // IMPORTANT!: Don't create a copy of the array with the following, because
  // it will decrease the performance of the algorithm:
  // [...options.slice(startIndex), ...options.slice(0, startIndex)];

  // Iterate from the startIndex to the end of the array
  for (let index = startIndex; index < options.length; index++) {
    if (stringStartsWithCurrentQuery(options[index])) {
      return index;
    }
  }

  // Iterate over the rest of the array, starting from the beginning to the
  // startIndex
  for (let index = 0; index < startIndex; index++) {
    if (stringStartsWithCurrentQuery(options[index])) {
      return index;
    }
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
const getIndexFromCurrentQuery = <T>(
  options: T[],
  currentQuery: string,
  startIndex: number,
  getCaptionFromItem: (item: T) => string
): number | null => {
  const indexWasFound = iterateStartingFromStartIndex(
    options,
    startIndex,
    (option: T) =>
      getCaptionFromItem(option).toLowerCase().startsWith(currentQuery)
  );

  if (indexWasFound !== null) {
    return indexWasFound;
  }

  // If the same letter is being repeated, cycle through first-letter matches
  // This is the same behavior as the native select
  if (stringHasAllTheSameLetter(currentQuery)) {
    const letter = currentQuery[0];

    return iterateStartingFromStartIndex(options, startIndex, (option: T) =>
      getCaptionFromItem(option).toLowerCase().startsWith(letter)
    );
  }

  // If no matches, return null
  return null;
};

export class TypeAhead<T> {
  #currentQuery: string = "";
  #lastSearchTime = 0;

  /**
   * Specifies the time-interval in milliseconds until the previous search
   * query is cleared. The timer is checked against the last call to the
   * `search` method.
   */
  delay: number;

  getCaptionFromItem: (item: T) => string;

  getChildrenFromItem?: ((item: T) => T[] | undefined | null) | undefined;

  getParentFromItem?: ((item: T) => T | undefined | null) | undefined;

  items?: T[] | undefined;

  constructor(options: {
    delay?: number;
    getCaptionFromItem: (item: T) => string;
    getChildrenFromItem?: (item: T) => T[] | undefined | null;
    getParentFromItem?: (item: T) => T | undefined | null;
    items?: T[];
  }) {
    const {
      delay,
      getCaptionFromItem,
      getChildrenFromItem,
      getParentFromItem,
      items
    } = options;

    this.delay = delay ?? DEFAULT_DELAY;
    this.getCaptionFromItem = getCaptionFromItem;
    this.getChildrenFromItem = getChildrenFromItem;
    this.getParentFromItem = getParentFromItem;
    this.items = items;
  }

  /**
   * TODO
   * @param character
   * @param activeItemIndex The current select item index, starting from 0. If
   * `undefined` or a negative value is provided, it means that there is no
   * active item.
   */
  search(
    character: string,
    activeItemIndex: number | undefined
  ): { item: T; index: number } | null {
    const { delay, getCaptionFromItem, items } = this;

    // No items
    if (items === undefined || items.length === 0) {
      return null;
    }

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
      activeItemIndex === undefined || activeItemIndex < 0
        ? 0
        : activeItemIndex + 1;

    const searchIndex = getIndexFromCurrentQuery(
      items,
      this.#currentQuery,
      startIndexToSearch,
      getCaptionFromItem
    );

    // If a match was found, return it
    if (searchIndex !== null) {
      return { item: items[searchIndex], index: searchIndex };
    }

    // If no matches, clear the search string and return null
    this.#currentQuery = "";
    return null;
  }
}
