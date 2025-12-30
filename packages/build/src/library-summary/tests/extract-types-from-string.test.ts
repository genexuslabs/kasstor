import { describe, expect, it } from "vitest";
import { extractTypesFromTypeString } from "../internal/extract-types-from-string";

describe("extractTypesFromTypeString", () => {
  it("should extract simple type names", () => {
    const result = extractTypesFromTypeString("MyType");
    expect(result).toEqual(new Set(["MyType"]));
  });

  it("should extract multiple type names", () => {
    const result = extractTypesFromTypeString("MyType | OtherType");
    expect(result).toEqual(new Set(["MyType", "OtherType"]));
  });

  it("should extract types from generic types", () => {
    const result = extractTypesFromTypeString("Promise<MyType>");
    expect(result).toEqual(new Set(["MyType"]));
  });

  it("should extract types from union types", () => {
    const result = extractTypesFromTypeString("MyType | OtherType | ThirdType");
    expect(result).toEqual(new Set(["MyType", "OtherType", "ThirdType"]));
  });

  it("should exclude built-in types", () => {
    const result = extractTypesFromTypeString("string | number | MyType");
    expect(result).toEqual(new Set(["MyType"]));
  });

  it("should handle namespaced types", () => {
    const result = extractTypesFromTypeString("Namespace.MyType");
    expect(result).toEqual(new Set(["Namespace"]));
  });

  it("should handle complex generic types", () => {
    const result = extractTypesFromTypeString(
      "Record<string, MyType> | Array<OtherType>"
    );
    expect(result).toEqual(new Set(["MyType", "OtherType"]));
  });

  it("should return empty set for built-in types only", () => {
    const result = extractTypesFromTypeString("string | number | boolean");
    expect(result).toEqual(new Set());
  });

  it("should handle void type", () => {
    const result = extractTypesFromTypeString("void");
    expect(result).toEqual(new Set());
  });

  it("should extract types from intersection types", () => {
    const result = extractTypesFromTypeString("MyType & OtherType");
    expect(result).toEqual(new Set(["MyType", "OtherType"]));
  });
});

