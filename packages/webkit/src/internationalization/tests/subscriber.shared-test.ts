import { describe, expect, test } from "vitest";
import { subscribeToLanguageChanges, unsubscribeToLanguageChanges } from "../index.js";

describe("[subscribeToLanguageChanges] and [unsubscribeToLanguageChanges]", () => {
  test("subscribe returns a unique string id with expected prefix", () => {
    const id = subscribeToLanguageChanges("feature-a", () => {});
    expect(typeof id).toBe("string");
    expect(id.startsWith("kasstor-webkit-i18n-subscriber-")).toBe(true);
    unsubscribeToLanguageChanges(id);
  });

  test("unsubscribe returns true when subscription existed", () => {
    const id = subscribeToLanguageChanges("feature-a", () => {});
    const removed = unsubscribeToLanguageChanges(id);
    expect(removed).toBe(true);
  });

  test("unsubscribe returns false when subscription did not exist", () => {
    const removed = unsubscribeToLanguageChanges("nonexistent-id");
    expect(removed).toBe(false);
  });

  test("unsubscribe same id twice: first true, second false", () => {
    const id = subscribeToLanguageChanges("feature-a", () => {});
    expect(unsubscribeToLanguageChanges(id)).toBe(true);
    expect(unsubscribeToLanguageChanges(id)).toBe(false);
  });

  test("multiple subscriptions return distinct ids", () => {
    const id1 = subscribeToLanguageChanges("feature-a", () => {});
    const id2 = subscribeToLanguageChanges("feature-a", () => {});
    const id3 = subscribeToLanguageChanges("feature-b", () => {});
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
    unsubscribeToLanguageChanges(id1);
    unsubscribeToLanguageChanges(id2);
    unsubscribeToLanguageChanges(id3);
  });
});
