import { generateDocs } from "./generate-docs";
import { getComponentFilesWithContent } from "./get-component-files";

const componentFilesWithContent = await getComponentFilesWithContent();

componentFilesWithContent.forEach(({ parentPath, filePath, content }) =>
  generateDocs(parentPath, filePath, content)
);
