import type { Range } from "@genexus/kasstor-lit-analyzer";
import type { TextSpan } from "typescript";

export function translateRange(range: Range): TextSpan {
	return {
		start: range.start,
		length: range.end - range.start
	};
}
