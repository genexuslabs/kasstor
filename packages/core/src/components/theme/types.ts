export type ThemeModel = string | string[] | ThemeItemModel | ThemeItemModel[];

export type ThemeItemModel = {
  name: string;

  attachStyleSheet?: boolean;
};
