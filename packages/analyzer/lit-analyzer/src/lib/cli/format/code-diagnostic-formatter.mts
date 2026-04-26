import { bgRedBright, bgYellow, black, bold, gray, underline } from "./ansi.js";
import type { SourceFile } from "typescript";
import type { LitDiagnostic } from "../../analyze/types/lit-diagnostic.js";
import type { AnalysisStats, DiagnosticFormatter } from "./diagnostic-formatter.mjs";
import { generalReport, markText, relativeFileName } from "./util.mjs";

export class CodeDiagnosticFormatter implements DiagnosticFormatter {
	report(stats: AnalysisStats): string | undefined {
		return generalReport(stats);
	}

	diagnosticTextForFile(file: SourceFile, diagnostics: LitDiagnostic[]): string | undefined {
		if (diagnostics.length === 0) return undefined;

		const diagnosticText = diagnostics.map(diagnostic => diagnosticTextForFile(file, diagnostic)).join("\n");

		return `
${underline(`${relativeFileName(file.fileName)}`)}
${diagnosticText}`;
	}
}

function diagnosticTextForFile(file: SourceFile, diagnostic: LitDiagnostic) {
	const MAX_LINE_WIDTH = 50;
	const MIN_MESSAGE_PADDING = 10;

	// Get line and character of start position
	const lineContext = file.getLineAndCharacterOfPosition(diagnostic.location.start);

	// Get start and end position of the line
	let linePositionRange = {
		start: file.getPositionOfLineAndCharacter(lineContext.line, 0),
		end: file.getLineEndOfPosition(diagnostic.location.start)
	};

	// Modify the line position range if the width of the line exceeds MAX_LINE_WIDTH
	if (linePositionRange.end - linePositionRange.start > MAX_LINE_WIDTH) {
		// Calculate even padding to both sides
		const padding = Math.max(MIN_MESSAGE_PADDING, Math.round((MAX_LINE_WIDTH - (diagnostic.location.end - diagnostic.location.start)) / 2));

		// Calculate new start and end position without exceeding the line position range
		const start = Math.max(linePositionRange.start, diagnostic.location.start - padding);
		const end = Math.min(linePositionRange.end, diagnostic.location.end + padding);

		linePositionRange = { start, end };
	}

	// Get the source file text on the position range
	const lineText = file.getFullText().substring(linePositionRange.start, linePositionRange.end);

	// Highlight the error in the text
	// The highlighting range is offsetted by subtracting the line start position
	const highlightingColorFunction = (str: string) => black(diagnostic.severity === "error" ? bgRedBright(str) : bgYellow(str));

	const markedLine = markText(
		lineText,
		{
			start: diagnostic.location.start - linePositionRange.start,
			length: diagnostic.location.end - diagnostic.location.start
		},
		highlightingColorFunction
	).replace(/^\s*/, " ");

	const block = [
		bold(`${diagnostic.message}${diagnostic.fixMessage ? ` ${diagnostic.fixMessage}` : ""}`),
		`${gray(`${lineContext.line + 1}:`)} ${markedLine}`,
		diagnostic.source == null ? undefined : gray(`${diagnostic.source}`)
	]
		.filter(line => line != null)
		.map(line => `    ${line}`)
		.join("\n");

	return `\n${block}\n`;
}
