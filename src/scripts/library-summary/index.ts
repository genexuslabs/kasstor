import { writeFile } from "fs/promises";
import { join } from "path";
import { extractLibraryComponents } from "./generator";

export const getLibrarySchema = (relativeComponentsSrcPath: string) =>
  extractLibraryComponents(join(process.cwd(), relativeComponentsSrcPath));

export const generateLibrarySchema = async (
  relativeComponentsSrcPath: string,
  resultFilePath = "library-schema.ts"
) => {
  const result = await getLibrarySchema(relativeComponentsSrcPath);

  return writeFile(
    resultFilePath,
    `export const result = ${JSON.stringify(result, undefined, 2)}`
  );
};

