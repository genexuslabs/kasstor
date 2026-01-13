import "vite/types/customEvent.d.ts";
import type {
  HMR_WS_EVENT_NAME,
  PERFORMANCE_METRIC_WS_EVENT_NAME
} from "../constants.js";

export type KasstorFileType = "component" | "scss" | "unknown" | "excluded";

export type KasstorHmrPayloadData = {
  componentPaths: string[];
  debug: boolean | undefined;
  fileType: KasstorFileType;
  operationId: string;
  scssPath?: string;
  tags: string[];
};

export type KasstorPerformanceMetricPayloadData = {
  operationId: string;
  operationType: "global types" | "readme" | "component" | "style";
  components: string[];
};

declare module "vite/types/customEvent.d.ts" {
  interface CustomEventMap {
    [HMR_WS_EVENT_NAME]: KasstorHmrPayloadData;
    [PERFORMANCE_METRIC_WS_EVENT_NAME]: KasstorPerformanceMetricPayloadData;
  }
}
