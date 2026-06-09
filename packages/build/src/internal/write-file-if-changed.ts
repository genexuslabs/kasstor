import { readFile, rename, unlink, writeFile } from "fs/promises";

/** Monotonic counter making each temp file name unique within the process. */
let tempCounter = 0;

/**
 * Write `content` to `filePath` only when it differs from what is already on
 * disk, and do so atomically (write to a temp sibling, then rename over the
 * target).
 *
 * The generated files (library summary, component declaration file, framework
 * JSX type files, readmes) are watched by external tools — e.g. `tsgo --watch`
 * and other Vite instances consuming the package. Rewriting a file with
 * byte-identical content still bumps its mtime, which re-triggers those
 * watchers and can cause rebuild loops or races: a concurrent reader observing
 * the file mid-truncate sees an empty/partial file (e.g. `tsgo` failing with
 * "is not a module"). Skipping the no-op write avoids the spurious trigger, and
 * the atomic rename guarantees a reader always sees either the complete
 * previous content or the complete next content — never a truncated file.
 *
 * @returns `true` when the file was written, `false` when skipped (unchanged).
 */
export const writeFileIfChanged = async (
  filePath: string,
  content: string
): Promise<boolean> => {
  try {
    const existing = await readFile(filePath, "utf-8");
    if (existing === content) {
      return false;
    }
  } catch {
    // The file does not exist yet — fall through and create it.
  }

  // Atomic write: a concurrent reader must never observe a truncated file, so
  // write to a unique temp sibling (same directory ⇒ same filesystem ⇒ atomic
  // rename) and then rename it over the target.
  const tempPath = `${filePath}.${++tempCounter}.tmp`;

  try {
    await writeFile(tempPath, content, "utf-8");
    await rename(tempPath, filePath);
  } catch (error) {
    // Best-effort cleanup of the temp file if the write/rename failed.
    await unlink(tempPath).catch(() => {});
    throw error;
  }

  return true;
};
