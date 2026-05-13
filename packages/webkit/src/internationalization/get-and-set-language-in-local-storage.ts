import { SHARED_LOCAL_STORAGE_KEYS } from "../shared-local-storage-keys.js";
import type { KasstorLanguageTag } from "./types";

export const getLanguageFromLocalStorage = () =>
  localStorage.getItem(
    SHARED_LOCAL_STORAGE_KEYS.LANGUAGE
  ) as KasstorLanguageTag | null;

export const setLanguageInLocalStorage = (tag: KasstorLanguageTag) =>
  localStorage.setItem(SHARED_LOCAL_STORAGE_KEYS.LANGUAGE, tag);
