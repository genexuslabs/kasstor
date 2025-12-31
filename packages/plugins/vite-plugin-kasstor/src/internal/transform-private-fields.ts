/**
 * Transform private fields (#field) to public fields in development mode
 * This allows applying proxies to classes for HMR support
 */

/**
 * Transforms private fields (#field) to public fields (__field)
 * This is a simple regex-based approach that handles most common cases
 *
 * @param code - The source code to transform
 * @returns The transformed code with private fields converted to public
 */
export function transformPrivateFieldsToPublic(code: string): string {
  // Match private field declarations and usages
  // Pattern: #fieldName (but not inside strings or comments)

  // First, let's handle private field declarations: #fieldName = value
  // and private field usages: this.#fieldName

  let transformed = code;

  // Track which private fields we've found to ensure consistent renaming
  const privateFieldMap = new Map<string, string>();

  // Find all private field declarations and usages
  // Pattern: #[a-zA-Z_$][a-zA-Z0-9_$]*
  const privateFieldRegex = /#([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

  let match;
  while ((match = privateFieldRegex.exec(code)) !== null) {
    const fieldName = match[1];
    const publicFieldName = `__${fieldName}`;

    if (!privateFieldMap.has(fieldName)) {
      privateFieldMap.set(fieldName, publicFieldName);
    }
  }

  // Replace all occurrences of private fields with public equivalents
  for (const [privateField, publicField] of privateFieldMap.entries()) {
    // Replace #fieldName with __fieldName
    const regex = new RegExp(`#${privateField}\\b`, "g");
    transformed = transformed.replace(regex, publicField);
  }

  return transformed;
}

/**
 * Check if a file should be transformed
 * @param filePath - The file path to check
 * @param filePattern - The pattern to match against
 * @returns True if the file should be transformed
 */
export function shouldTransformFile(
  filePath: string,
  filePattern: RegExp
): boolean {
  return filePattern.test(filePath);
}

