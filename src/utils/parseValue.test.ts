import { describe, it, expect } from "vitest";
import { parseValue } from "./parseValue";

describe("parseValue", () => {
  describe("Non-String Inputs", () => {
    it("should return a File object unmodified", () => {
      const file = new File(["content"], "test.txt");
      expect(parseValue(file)).toBe(file);
    });

    it("should return an already parsed number unmodified", () => {
      expect(parseValue(123)).toBe(123);
    });

    it("should return an already parsed boolean unmodified", () => {
      expect(parseValue(true)).toBe(true);
    });
  });

  describe("Numeric Types", () => {
    it("should parse valid integer string", () => {
      expect(parseValue("123", "number")).toBe(123);
      expect(parseValue("123", "int")).toBe(123);
    });

    it("should parse valid float string", () => {
      expect(parseValue("12.34", "float")).toBe(12.34);
      expect(parseValue("12.34", "double")).toBe(12.34);
    });

    it("should return string for invalid number string", () => {
      expect(parseValue("abc", "number")).toBe("abc");
    });
  });

  describe("Boolean Types", () => {
    it("should parse 'true' (case-insensitive)", () => {
      expect(parseValue("true", "bool")).toBe(true);
      expect(parseValue("TRUE", "bool")).toBe(true);
    });

    it("should parse 'false' (case-insensitive)", () => {
      expect(parseValue("false", "bool")).toBe(false);
      expect(parseValue("FALSE", "bool")).toBe(false);
    });

    it("should return string for invalid boolean string", () => {
      expect(parseValue("yes", "bool")).toBe("yes");
    });
  });

  describe("Array Types", () => {
    it("should parse valid JSON array string", () => {
      expect(parseValue("[1, 2, 3]", "array")).toEqual([1, 2, 3]);
      expect(parseValue("[1, 2, 3]", "list")).toEqual([1, 2, 3]);
      expect(parseValue("[1, 2, 3]", "[]")).toEqual([1, 2, 3]);
    });

    it("should wrap valid JSON number string in an array", () => {
      expect(parseValue("0", "array")).toEqual([0]);
    });

    it("should wrap valid JSON text string in an array", () => {
      expect(parseValue('"text"', "array")).toEqual(["text"]);
    });

    it("should wrap valid JSON object string in an array", () => {
      expect(parseValue('{"id": 1}', "array")).toEqual([{ id: 1 }]);
    });

    it("should wrap invalid JSON plain text in an array", () => {
      expect(parseValue("hello", "array")).toEqual(["hello"]);
    });

    it("should return empty string unmodified (not wrapped)", () => {
      expect(parseValue("", "array")).toBe("");
      expect(parseValue("   ", "array")).toBe("   ");
    });
  });

  describe("Object Types", () => {
    it("should parse valid JSON object string", () => {
      expect(parseValue('{"key": "value"}', "object")).toEqual({ key: "value" });
      expect(parseValue('{"key": "value"}', "map")).toEqual({ key: "value" });
      expect(parseValue('{"key": "value"}', "dict")).toEqual({ key: "value" });
    });

    it("should return invalid JSON object string as fallback", () => {
      expect(parseValue("{bad_json", "object")).toBe("{bad_json");
    });

    it("should parse valid JSON primitive without wrapping in an array", () => {
      expect(parseValue("0", "object")).toBe(0);
      expect(parseValue('"test"', "object")).toBe("test");
    });
  });

  describe("Unknown or Empty Types (Fallback Parsing)", () => {
    it("should loosely parse valid JSON array", () => {
      expect(parseValue("[1, 2]")).toEqual([1, 2]);
      expect(parseValue("[1, 2]", "")).toEqual([1, 2]);
    });

    it("should loosely parse valid JSON object", () => {
      expect(parseValue('{"a": 1}')).toEqual({ a: 1 });
    });

    it("should return invalid JSON string starting with { as fallback", () => {
      expect(parseValue("{abc")).toBe("{abc");
    });

    it("should return plain text string unmodified", () => {
      expect(parseValue("hello")).toBe("hello");
    });
  });
});
