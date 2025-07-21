import { micromark } from "micromark";
import fsPromises from "node:fs/promises";
import { analyzeText, transformAnalyzerResult } from "web-component-analyzer";

import path from "node:path";
import { styleText } from "node:util";
import type { ChameleonDocs } from "./types";

const QUOTES_REGEX = /(^"|"$)/g;
const DECORATIVE_IMAGE_DEFAULT_SCSS_VAR = "#{$default-decorative-image-size}";
const DECORATIVE_IMAGE_DEFAULT_VALUE = "0.875em";
const LESS_THAN_HTML = "&lt;";
const GREATER_THAN_HTML = "&gt;";

const getCssPropertyDefault = (defaultValue: string) =>
  replaceLessAndGreaterThanWithHTML(
    defaultValue
      .replace(QUOTES_REGEX, "")
      .trim()
      .replace(
        DECORATIVE_IMAGE_DEFAULT_SCSS_VAR,
        DECORATIVE_IMAGE_DEFAULT_VALUE
      )
  );

const replaceLessAndGreaterThanWithHTML = (value: string) =>
  value.replace(/</g, LESS_THAN_HTML).replace(/>/g, GREATER_THAN_HTML);

const addDetailsSummary = (title: string, content: string) => `

<details open>
  <summary>
  
  ## ${title}
  </summary>
  
${content}
</details>`;

export const generateDocs = (
  fileParentPath: string,
  filePath: string,
  fileContent: string
) => {
  const { results, program } = analyzeText(fileContent);

  const chameleonDocs: ChameleonDocs = JSON.parse(
    transformAnalyzerResult("json", results[0], program)
  );

  if (chameleonDocs.tags.length === 0) {
    console.error(`The file ${filePath.replace(process.cwd(), "")} doesn't have any component. Please, verify that is declared in the HTMLElementTagNameMap:

declare global {
  interface HTMLElementTagNameMap {
    "my-element": MyElement;
  }
}`);

    return;
  }

  const componentDoc = chameleonDocs.tags[0];
  const { properties, events, cssParts, cssProperties } = componentDoc;

  const propertiesReadme = `  <table>
    <thead>
      <tr>
        <th scope="col">Property</th>
        <th scope="col">Attribute</th>
        <th scope="col">Description</th>
        <th scope="col">Type</th>
        <th scope="col">Default</th>
      </tr>
    </thead>
    <tbody>
${properties
  .map(
    property => `      <tr>
        <td><code>${property.name}</code></td>
        <td>${property.attribute ? `<code>${property.attribute}</code>` : "-"}</td>
        <td>${property.description ? micromark(property.description) : "-"}</td>
        <td><code>${replaceLessAndGreaterThanWithHTML(property.type)}</code></td>
        <td><code>${property.default ? replaceLessAndGreaterThanWithHTML(property.default) : "undefined"}</code></td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`;

  const eventsReadme = events
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Event</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
    <tbody>
${events
  .map(
    event => `      <tr>
        <td><code>${event.name}</code></td>
        <td>${event.description ? micromark(event.description) : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

  const cssPartsReadme = cssParts
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Part</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
    <tbody>
${cssParts
  .map(
    cssPart => `      <tr>
        <td><code>${cssPart.name}</code></td>
        <td>${cssPart.description ? micromark(cssPart.description) : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

  const cssPropertiesReadme = cssProperties
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Custom Var</th>
        <th scope="col">Description</th>
        <th scope="col">Default</th>
      </tr>
    </thead>
    <tbody>
${cssProperties
  .map(
    cssProperty => `      <tr>
        <td><code>${cssProperty.name.trim()}</code></td>
        <td>${cssProperty.description ? micromark(cssProperty.description.trim()) : "-"}</td>
        <td>${cssProperty.default ? `<code>${getCssPropertyDefault(cssProperty.default)}</code>` : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

  let readme = `# ${componentDoc.name}${componentDoc.description ? "\n\n" + micromark(componentDoc.description) : ""}${addDetailsSummary("Properties", propertiesReadme)}`;

  if (eventsReadme) {
    readme += addDetailsSummary("Events", eventsReadme);
  }

  if (cssPartsReadme) {
    readme += addDetailsSummary("CSS Parts", cssPartsReadme);
  }

  if (cssPropertiesReadme) {
    readme += addDetailsSummary("CSS Custom Vars", cssPropertiesReadme);
  }

  // eslint-disable-next-line no-console
  console.log(
    styleText("green", "  Generated:"),
    fileParentPath.replaceAll("\\", "/") +
      "/" +
      styleText("cyanBright", "readme.md")
  );

  fsPromises.writeFile(path.join(fileParentPath, "readme.md"), readme, {
    encoding: "utf-8"
  });
};

// console.log(files);

// const command = `wca analyze "src/**/*.lit.ts" --format json2 --features method --outFile readme.json`;

// exec(command, (error, stdout, stderr) => {
//   if (error) {
//     console.error(`❌ Error: ${error.message}`);
//     return;
//   }

//   if (stderr) {
//     console.error(`⚠️ Warning: ${stderr}`);
//   }

//   // console.log(
//   //   fs.readFileSync("readme.json", {
//   //     encoding: "utf-8"
//   //   })
//   // );
//   rmSync("readme.json");

//   // All good
// });
