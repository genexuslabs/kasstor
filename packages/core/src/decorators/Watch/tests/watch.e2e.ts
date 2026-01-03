import { describe } from "vitest";

/**
 * TODO: Validate the behavior of the following cases:
 *
 *
 * export class WatchTest extends KasstorElement {
 *   @property() prop1: string | undefined;
 *   @property() prop2: string | undefined;
 *   @property() prop3: string | undefined;
 *   @property() prop4: string | undefined;
 *
 *   @Watch("prop1")
 *   protected callback1(newValue: string | undefined, oldValue: string | undefined) {
 *     Handle the change for prop1
 *   }
 *
 *  @Watch(["prop2", "prop3"])
 *  protected callback2(newValue: string | undefined, oldValue: string | undefined) {
 *    Should this callback be triggered only once (even if both properties change)?
 *  }
 *
 *  @Watch(["prop1", "prop3"])
 *  protected callback3(newValue: string | undefined, oldValue: string | undefined) {
 *    Should we support this case? In other words, if the prop1 changes, the callback1 and callback3 should be triggered
 *  }
 *
 *   @Watch("prop4")
 *   protected callback4(newValue: string | undefined, oldValue: string | undefined) {
 *     Handle the change for prop4
 *   }
 *
 *   @Watch("prop4")
 *   protected callback5(newValue: string | undefined, oldValue: string | undefined) {
 *     Should we support this case? In other words, if the prop4 changes, the callback4 and callback5 should be triggered
 *   }
 * }
 */

describe("[Decorator]", () => {
  describe.todo("[Component]", () => {});
});

