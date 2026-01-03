import { micromark } from "micromark";

import type { ComponentDefinition } from "../typings/library-components";

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

const addDetailsSummary = (title: string, content: string) =>
  content === ""
    ? ""
    : `

<details open>
  <summary>
  
  ## ${title}
  </summary>
  
${content}
</details>`;

const getComponentProperties = ({ properties }: ComponentDefinition) =>
  properties && properties.length !== 0
    ? `  <table>
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
  </table>`
    : "";

const getComponentEvents = ({ events }: ComponentDefinition) =>
  events && events.length !== 0
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Event</th>
        <th scope="col">Description</th>
        <th scope="col">Detail Type</th>
      </tr>
    </thead>
    <tbody>
${events
  .map(
    event => `      <tr>
        <td><code>${event.name}</code></td>
        <td>${event.description ? micromark(event.description) : "-"}</td>
        <td>${event.detailType ? `<code>${replaceLessAndGreaterThanWithHTML(event.detailType)}</code>` : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

export const getComponentSlots = ({ slots }: ComponentDefinition) =>
  slots && slots.length !== 0
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Part</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
    <tbody>
${slots
  .map(
    slot => `      <tr>
        <td><code>${slot.name}</code></td>
        <td>${slot.description ? micromark(slot.description) : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

export const getComponentCssParts = ({ parts }: ComponentDefinition) =>
  parts && parts.length !== 0
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Part</th>
        <th scope="col">Description</th>
      </tr>
    </thead>
    <tbody>
${parts
  .map(
    part => `      <tr>
        <td><code>${part.name}</code></td>
        <td>${part.description ? micromark(part.description) : "-"}</td>
      </tr>`
  )
  .join("\n")}
    </tbody>
  </table>`
    : "";

export const getComponentCssProperties = ({
  cssVariables
}: ComponentDefinition) =>
  cssVariables && cssVariables.length !== 0
    ? `  <table>
    <thead>
      <tr>
        <th scope="col">Custom Var</th>
        <th scope="col">Description</th>
        <th scope="col">Default</th>
      </tr>
    </thead>
    <tbody>
${cssVariables
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

export const getComponentReadme = (component: ComponentDefinition) => {
  const propertiesReadme = getComponentProperties(component);
  const eventsReadme = getComponentEvents(component);
  const slotsReadme = getComponentSlots(component);
  const cssPartsReadme = getComponentCssParts(component);
  const cssPropertiesReadme = getComponentCssProperties(component);

  let readme = `# ${component.tagName}`;

  if (component.description) {
    readme += "\n\n" + micromark(component.description);
  }

  readme += addDetailsSummary("Properties", propertiesReadme);

  readme += addDetailsSummary("Events", eventsReadme);

  readme += addDetailsSummary("Slots", slotsReadme);

  readme += addDetailsSummary("CSS Parts", cssPartsReadme);

  readme += addDetailsSummary("CSS Custom Vars", cssPropertiesReadme);

  // Additional line ending for prettier purposes
  readme += "\n";

  // // eslint-disable-next-line no-console
  // console.log(
  //   styleText("green", "  Generated:"),
  //   fileParentPath.replaceAll("\\", "/") +
  //     "/" +
  //     styleText("cyanBright", "readme.md")
  // );
  return readme;
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

