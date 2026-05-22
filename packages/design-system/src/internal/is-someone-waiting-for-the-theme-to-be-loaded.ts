import { getThemePromiseInfoFromCache } from "../get-style-sheet-promise-info";

export const isSomeoneWaitingForTheThemeToBeLoaded = (name: string) =>
  getThemePromiseInfoFromCache(name) !== undefined;

