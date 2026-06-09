/**
 * Detects the line ending style used in a file.
 * Returns the detected line ending or the provided fallback.
 */
export const detectLineEnding = (
  content: string,
  fallback: "\n" | "\r\n" = "\n"
): "\n" | "\r\n" => {
  if (content.includes("\r\n")) {
    return "\r\n";
  }
  if (content.includes("\n")) {
    return "\n";
  }
  return fallback;
};
