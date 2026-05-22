import type { ThemeItemModel, ThemeModel } from "../types";

const mapStringOrThemeItemModel = <T extends string | ThemeItemModel>(item: T): ThemeItemModel =>
  typeof item === "string" ? { name: item } : item;

export const normalizeModel = (model: ThemeModel | undefined | null): ThemeItemModel[] => {
  if (model == null) {
    return [];
  }

  if (Array.isArray(model)) {
    const result: ThemeItemModel[] = [];

    // For let i ... is the fastest way to iterate over an array in JavaScript
    for (let i = 0; i < model.length; i++) {
      result.push(mapStringOrThemeItemModel(model[i]));
    }
    return result;
  }

  return [mapStringOrThemeItemModel(model)];
};
