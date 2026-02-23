/**
 * Shared helpers for i18n E2E tests. No describe/test; only types, constants,
 * and functions. E2E tests import from here to avoid duplication.
 */

import { unsubscribeToLanguageChanges } from "../index.js";
import type { KasstorLanguage } from "../types.js";

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
): Record<KasstorLanguage, () => Promise<T>> => ({
  arabic: () => Promise.resolve(en),
  chinese: () => Promise.resolve(en),
  english: () => Promise.resolve(en),
  french: () => Promise.resolve(en),
  german: () => Promise.resolve(en),
  italian: () => Promise.resolve(en),
  japanese: () => Promise.resolve(en),
  portuguese: () => Promise.resolve(en),
  spanish: () => Promise.resolve(es)
});
