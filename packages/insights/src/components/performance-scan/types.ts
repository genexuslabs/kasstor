import type { LitElement } from "lit";

export type PerformanceScanItemModel = {
  anchorRef: LitElement;
  anchorTagName: string;
  changes: {
    property: PropertyKey;
    oldValue: unknown;
    newValue: unknown;
    changed: boolean;
  }[];
  id: number;
  renderCount: number;
  removeTimeout?: NodeJS.Timeout;
  timeStamp: Date;
};

export type PerformanceScanRenderedItems = Map<
  LitElement,
  PerformanceScanItemModel
>;
