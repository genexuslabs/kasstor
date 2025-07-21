import path from "path";
import { styleText } from "util";
import { generateComponentsDefinition } from "./generate-types";

// Paths
const projectPath = path.join(process.cwd(), "src");
const componentsPattern = "./src";

const startTime = performance.now();

generateComponentsDefinition(projectPath, componentsPattern)
  .then(() =>
    console.log(
      "Generated",
      styleText("cyan", "components.d.ts"),
      "in",
      styleText("yellow", (performance.now() - startTime).toFixed(2) + " ms")
    )
  )
  .catch(console.error);
