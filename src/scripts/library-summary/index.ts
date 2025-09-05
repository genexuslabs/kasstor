import { writeFile } from "fs/promises";
import { join } from "path";
import * as prettier from "prettier";
import { getComponentDeclaration } from "./generate-component-declaration";
import { extractLibraryComponents } from "./generator";

export const getLibrarySummary = (relativeComponentsSrcPath: string) =>
  extractLibraryComponents(join(process.cwd(), relativeComponentsSrcPath));

export const generateLibrarySummary = async (
  relativeComponentsSrcPath: string,
  resultFilePath = "library-summary.ts"
) => {
  const libraryComponents = await getLibrarySummary(relativeComponentsSrcPath);
  const componentsDeclarationFile = getComponentDeclaration(
    relativeComponentsSrcPath,
    libraryComponents
  );

  return Promise.all([
    writeFile(
      resultFilePath,
      `export const result = ${await prettier.format(JSON.stringify(libraryComponents, undefined, 2), { parser: "typescript" })}`
    ),
    writeFile("components.ts", componentsDeclarationFile)
  ]);
};

generateLibrarySummary("src/");

