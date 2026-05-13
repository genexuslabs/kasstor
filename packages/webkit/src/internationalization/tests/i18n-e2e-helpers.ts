/**
 * Shared helpers for i18n E2E tests. No describe/test; only types, constants,
 * and functions. E2E tests import from here to avoid duplication.
 */

import { unsubscribeToLanguageChanges } from "../index.js";
import type { KasstorLanguageSubtag } from "../types.js";

export const FEATURE_MAIN = "app-main";
export const FEATURE_TRIAL = "trial";

export type AppMainShape = { greet: string; footer: string };
export type TrialShape = { price: string; limit: string };

const subscriberIds: string[] = [];

export function trackSubscriber(id: string) {
  subscriberIds.push(id);
}

export function resetI18nState() {
  subscriberIds.forEach(id => unsubscribeToLanguageChanges(id));
  subscriberIds.length = 0;
  delete (globalThis as unknown as { kasstorWebkitI18n?: unknown }).kasstorWebkitI18n;
}

export function setPathname(pathname: string) {
  window.history.replaceState({}, "", pathname);
}

export const createEnEsLoader = <T extends Record<string, unknown>>(
  en: T,
  es: T
): Record<KasstorLanguageSubtag, () => Promise<T>> => ({
  ar: () => Promise.resolve(en),
  de: () => Promise.resolve(en),
  en: () => Promise.resolve(en),
  es: () => Promise.resolve(es),
  fr: () => Promise.resolve(en),
  it: () => Promise.resolve(en),
  ja: () => Promise.resolve(en),
  pt: () => Promise.resolve(en),
  zh: () => Promise.resolve(en)
});
