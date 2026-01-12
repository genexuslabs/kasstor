import type { Dirent } from "fs";
import { readdir } from "fs/promises";
import { extname, resolve } from "path";

export interface FileEntry {
  path: string;
  extension: string;
}

export async function readAllFiles(rootDir: string) {
  const results: FileEntry[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[] | undefined;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const tasks: Promise<void>[] = [];

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        tasks.push(walk(fullPath));
      } else if (entry.isFile()) {
        results.push({
          path: fullPath,
          extension: extname(fullPath)
        });
      }
    }

    await Promise.all(tasks);
  }

  await walk(rootDir);
  return results;
}

