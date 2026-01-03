import { micromark } from "micromark";
import { format } from "prettier";

import type {
  ComponentDefinition,
  ComponentDefinitionCssVariable,
  ComponentDefinitionEvent,
  ComponentDefinitionMethod,
  ComponentDefinitionPart,
  ComponentDefinitionProperty,
  ComponentDefinitionSlot
} from "../typings/library-components";

const QUOTES_REGEX = /(^"|"$)/g;
const DECORATIVE_IMAGE_DEFAULT_SCSS_VAR = "#{$default-decorative-image-size}";
const DECORATIVE_IMAGE_DEFAULT_VALUE = "0.875em";
const LESS_THAN_HTML = "&lt;";
const GREATER_THAN_HTML = "&gt;";

const formatMultilineTypes = async (type: string) =>
  type.split("\n").length > 1
    ? (
        await format("const " + type, {
          parser: "typescript",
          printWidth: 300,
          trailingComma: "none"
        })
      )
        .replace(/const |\n/g, "")
        .replace(/;$/g, "")
    : type;

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

const joinResults = async <T>(
  array: T[] | undefined,
  fn: (item: T) => string | Promise<string>
) =>
  array && array.length !== 0
    ? (await Promise.all(array.map(fn))).join("\n\n---\n\n")
    : "";

const getComponentProperty = async (property: ComponentDefinitionProperty) => {
  let result = `### \`${await formatMultilineTypes(property.name + ": " + property.type)}\``;

  if (property.description) {
    result += `\n\n${micromark(property.description)}`;
  }

  if (property.attribute) {
    result += `\n\n**Attribute**: <code>${property.attribute}</code>`;
  }

  if (property.default) {
    result += `\n\n**Default**: <code>${property.default ? replaceLessAndGreaterThanWithHTML(property.default) : "undefined"}</code>`;
  }

  return result;
};

const getComponentEvent = (event: ComponentDefinitionEvent) => {
  let result = `### \`${event.name}: ${replaceLessAndGreaterThanWithHTML(event.detailType)}\``;

  if (event.description) {
    result += `\n\n${micromark(event.description)}`;
  }

  return result;
};

const getComponentMethod = async (property: ComponentDefinitionMethod) => {
  let result = `### \`${await formatMultilineTypes(property.name + ": " + `(${property.paramTypes.map(param => param.name + ": " + param.type).join(", ")}) => ` + property.returnType)}\``;

  if (property.description) {
    result += `\n\n${micromark(property.description)}`;
  }

  return result;
};

const getComponentSlot = (slot: ComponentDefinitionSlot) => {
  let result = `### \`${slot.name}\``;

  if (slot.description) {
    result += `\n\n${micromark(slot.description)}`;
  }

  return result;
};

const getComponentCssPart = (part: ComponentDefinitionPart) => {
  let result = `### \`${part.name}\``;

  if (part.description) {
    result += `\n\n${micromark(part.description)}`;
  }

  return result;
};

const getComponentCssProperty = (
  cssVariable: ComponentDefinitionCssVariable
) => {
  let result = `### \`${cssVariable.name}\``;

  if (cssVariable.description) {
    result += `\n\n${micromark(cssVariable.description)}`;
  }

  if (cssVariable.default) {
    result += `\n\n**Default**: <code>${getCssPropertyDefault(cssVariable.default)}</code>`;
  }

  return result;
};

export const getComponentReadme = async (component: ComponentDefinition) => {
  const [
    propertiesReadme,
    eventsReadme,
    methodsReadme,
    slotsReadme,
    cssPartsReadme,
    cssPropertiesReadme
  ] = await Promise.all([
    joinResults(component.properties, getComponentProperty),
    joinResults(component.events, getComponentEvent),
    joinResults(component.methods, getComponentMethod),
    joinResults(component.slots, getComponentSlot),
    joinResults(component.parts, getComponentCssPart),
    joinResults(component.cssVariables, getComponentCssProperty)
  ]);

  let readme = `# \`${component.tagName}\``;

  if (component.description) {
    readme += "\n\n" + micromark(component.description);
  }

  readme += addDetailsSummary("Properties", propertiesReadme);

  readme += addDetailsSummary("Events", eventsReadme);

  readme += addDetailsSummary("Methods", methodsReadme);

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

