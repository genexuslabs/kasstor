import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { ComponentValidator } from "../internal/validate-components";
import type { ComponentDefinition } from "../types";

/**
 * Helper to create a mock source file and class declaration for testing
 */
function createMockSourceFileAndClass(code: string): {
  sourceFile: ts.SourceFile;
  classDeclaration: ts.ClassDeclaration;
} {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    code,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );

  let classDeclaration: ts.ClassDeclaration | null = null;

  const findClass = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      classDeclaration = node;
      return;
    }
    ts.forEachChild(node, findClass);
  };

  findClass(sourceFile);

  if (!classDeclaration) {
    throw new Error("No class declaration found in test code");
  }

  return { sourceFile, classDeclaration };
}

describe("ComponentValidator", () => {
  it("should not throw for valid components", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent",
      description: "A test component",
      fullClassJSDoc: "/**\n * A test component\n */",
      srcPath: "./my-component.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    expect(() =>
      validator.validateAndAdd(component, sourceFile, classDeclaration)
    ).not.toThrow();
  });

  it("should throw for duplicate tag names with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component1: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent1",
      description: "First component",
      fullClassJSDoc: "/**\n * First\n */",
      srcPath: "./my-component-1.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    const component2: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent2",
      description: "Duplicate tag",
      fullClassJSDoc: "/**\n * Duplicate\n */",
      srcPath: "./my-component-2.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    validator.validateAndAdd(component1, sourceFile, classDeclaration);

    expect(() =>
      validator.validateAndAdd(component2, sourceFile, classDeclaration)
    ).toThrow(/Duplicate tag name "my-component"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component2, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component-2\.ts:\d+:\d+/);
    }
  });

  it("should throw for duplicate class names with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component1: ComponentDefinition = {
      access: "public",
      tagName: "my-component-1",
      className: "MyComponent",
      description: "First component",
      fullClassJSDoc: "/**\n * First\n */",
      srcPath: "./my-component-1.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    const component2: ComponentDefinition = {
      access: "public",
      tagName: "my-component-2",
      className: "MyComponent",
      description: "Duplicate class",
      fullClassJSDoc: "/**\n * Duplicate\n */",
      srcPath: "./my-component-2.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    validator.validateAndAdd(component1, sourceFile, classDeclaration);

    expect(() =>
      validator.validateAndAdd(component2, sourceFile, classDeclaration)
    ).toThrow(/Duplicate class name "MyComponent"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component2, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component-2\.ts:\d+:\d+/);
    }
  });

  it("should throw for duplicate property names with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent",
      description: "Component with duplicate properties",
      fullClassJSDoc: "/**\n * Component\n */",
      srcPath: "./my-component.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      properties: [
        {
          name: "value",
          attribute: "value",
          type: "string",
          default: "undefined"
        },
        {
          name: "value",
          attribute: "value",
          type: "number",
          default: "0"
        }
      ]
    };

    expect(() =>
      validator.validateAndAdd(component, sourceFile, classDeclaration)
    ).toThrow(/Duplicate property name "value"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component\.ts:\d+:\d+/);
    }
  });

  it("should throw for duplicate event names with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent",
      description: "Component with duplicate events",
      fullClassJSDoc: "/**\n * Component\n */",
      srcPath: "./my-component.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      events: [
        {
          name: "change",
          detailType: "string"
        },
        {
          name: "change",
          detailType: "number"
        }
      ]
    };

    expect(() =>
      validator.validateAndAdd(component, sourceFile, classDeclaration)
    ).toThrow(/Duplicate event name "change"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component\.ts:\d+:\d+/);
    }
  });

  it("should throw for duplicate method names with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component: ComponentDefinition = {
      access: "public",
      tagName: "my-component",
      className: "MyComponent",
      description: "Component with duplicate methods",
      fullClassJSDoc: "/**\n * Component\n */",
      srcPath: "./my-component.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      methods: [
        {
          name: "doSomething",
          paramTypes: [],
          returnType: "void"
        },
        {
          name: "doSomething",
          paramTypes: [{ name: "param", type: "string" }],
          returnType: "void"
        }
      ]
    };

    expect(() =>
      validator.validateAndAdd(component, sourceFile, classDeclaration)
    ).toThrow(/Duplicate method name "doSomething"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component\.ts:\d+:\d+/);
    }
  });

  it("should allow multiple components with different names", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component1: ComponentDefinition = {
      access: "public",
      tagName: "my-component-1",
      className: "MyComponent1",
      description: "First component",
      fullClassJSDoc: "/**\n * First\n */",
      srcPath: "./my-component-1.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    const component2: ComponentDefinition = {
      access: "public",
      tagName: "my-component-2",
      className: "MyComponent2",
      description: "Second component",
      fullClassJSDoc: "/**\n * Second\n */",
      srcPath: "./my-component-2.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true
    };

    expect(() =>
      validator.validateAndAdd(component1, sourceFile, classDeclaration)
    ).not.toThrow();
    expect(() =>
      validator.validateAndAdd(component2, sourceFile, classDeclaration)
    ).not.toThrow();
  });

  it("should throw for duplicate type definitions in different modules with line and column info", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component1: ComponentDefinition = {
      access: "public",
      tagName: "my-component-1",
      className: "MyComponent1",
      description: "First component",
      fullClassJSDoc: "/**\n * First\n */",
      srcPath: "./my-component-1.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      propertyImportTypes: {
        "./types": ["MyType"]
      }
    };

    const component2: ComponentDefinition = {
      access: "public",
      tagName: "my-component-2",
      className: "MyComponent2",
      description: "Second component",
      fullClassJSDoc: "/**\n * Second\n */",
      srcPath: "./my-component-2.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      propertyImportTypes: {
        "./other-types": ["MyType"]
      }
    };

    validator.validateAndAdd(component1, sourceFile, classDeclaration);

    expect(() =>
      validator.validateAndAdd(component2, sourceFile, classDeclaration)
    ).toThrow(/Duplicate type definition "MyType"/);

    // Verify error includes file location
    try {
      validator.validateAndAdd(component2, sourceFile, classDeclaration);
    } catch (error) {
      expect((error as Error).message).toMatch(/my-component-2\.ts:\d+:\d+/);
    }
  });

  it("should allow same type name from same module in multiple components", () => {
    const validator = new ComponentValidator();
    const { sourceFile, classDeclaration } = createMockSourceFileAndClass(
      "class MyComponent {}"
    );

    const component1: ComponentDefinition = {
      access: "public",
      tagName: "my-component-1",
      className: "MyComponent1",
      description: "First component",
      fullClassJSDoc: "/**\n * First\n */",
      srcPath: "./my-component-1.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      propertyImportTypes: {
        "./types": ["MyType"]
      }
    };

    const component2: ComponentDefinition = {
      access: "public",
      tagName: "my-component-2",
      className: "MyComponent2",
      description: "Second component",
      fullClassJSDoc: "/**\n * Second\n */",
      srcPath: "./my-component-2.ts",
      developmentStatus: "stable",
      mode: "open",
      shadow: true,
      propertyImportTypes: {
        "./types": ["MyType"]
      }
    };

    expect(() =>
      validator.validateAndAdd(component1, sourceFile, classDeclaration)
    ).not.toThrow();
    expect(() =>
      validator.validateAndAdd(component2, sourceFile, classDeclaration)
    ).not.toThrow();
  });
});

