import type { DirectiveResult } from "lit/async-directive.js";
import type { KasstorSignal } from "../../typings/types.js";
import type { WatchDirective } from "./index.js";

export type WatchDirectiveFunction = <T>(
  signal: KasstorSignal<T>
) => DirectiveResult<typeof WatchDirective<T>>;
