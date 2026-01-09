import { SHARED_LOCAL_STORAGE_KEYS } from "../shared-local-storage-keys.js";
import type { KasstorLanguageSubtag } from "./types";

export const getLanguageFromLocalStorage = () =>
  localStorage.getItem(
    SHARED_LOCAL_STORAGE_KEYS.LANGUAGE
  ) as KasstorLanguageSubtag | null;

export const setLanguageInLocalStorage = (subtag: KasstorLanguageSubtag) =>
  localStorage.setItem(SHARED_LOCAL_STORAGE_KEYS.LANGUAGE, subtag);

