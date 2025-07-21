import fsPromises from "node:fs/promises";
import path from "node:path";

const directoryPath = path.join(process.cwd(), "./src/components");

export const getComponentFilesWithContent = async (): Promise<
  {
    filePath: string;
    parentPath: string;
    content: string;
  }[]
> => {
  const filePaths = (
    await fsPromises.readdir(directoryPath, {
      recursive: true,
      withFileTypes: true
    })
  )

    .filter(file => file.isFile() && file.name.endsWith(".lit.ts"))
    .map(file => ({
      filePath: path.join(file.parentPath, file.name),
      parentPath: file.parentPath
    }))
    .sort((a, b) => (a.filePath <= b.filePath ? -1 : 0));

  return Promise.all(
    filePaths.map(async ({ filePath, parentPath }) => ({
      filePath,
      parentPath,
      content: await fsPromises.readFile(filePath, { encoding: "utf-8" })
    }))
  );
};
