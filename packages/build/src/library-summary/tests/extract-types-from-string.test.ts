import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { extractClassMembers } from "../internal/extract-class-members.js";
import {
  getComponentClassAndDecorator,
  getTsSourceFile
} from "../internal/extract-component-definition.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_COMPONENT_FILE_PATH = join(__dirname, "test-component.ts");
const TEST_COMPONENT_CONTENT = await readFile(
  TEST_COMPONENT_FILE_PATH,
  "utf-8"
);
const TS_SOURCE_FILE = getTsSourceFile(
  TEST_COMPONENT_FILE_PATH,
  TEST_COMPONENT_CONTENT
);

const { componentClass, componentDecorator } = getComponentClassAndDecorator(
  TS_SOURCE_FILE,
  undefined
);

describe("[getComponentClassAndDecorator]", () => {
  it("the componentClass and componentDecorator should be defined", () => {
    expect(componentClass).toBeTruthy();
    expect(componentDecorator).toBeTruthy();
  });
});

describe("[extractClassMembers]", () => {
  it("should extract simple type names", () => {
    const result = extractClassMembers(componentClass!, TS_SOURCE_FILE);
    expect(result).toEqual([
      [
        {
          attribute: "value",
          default: '"test"',
          description: "Property value description.",
          name: "value",
          reflect: undefined,
          required: undefined,
          type: " string"
        }
      ],
      [
        {
          description: "event1 description.",
          detailType: "string",
          name: "event1"
        }
      ],
      [
        {
          description: "Description for method1.",
          name: "method1",
          paramTypes: [
            {
              description: undefined,
              name: "param1",
              type: "number"
            }
          ],
          returnType: "string"
        }
      ]
    ]);
  });
});
