import { describe, it, expect } from "vitest";
import { assertImplementsBaseParser, REQUIRED_METHODS } from "../../core/parser/base/contract.js";
import { makeMockParser } from "../setup/mock-parser.js";

describe("assertImplementsBaseParser — runtime BaseParser Contract (12 §2)", () => {
  it("accepts a parser implementing all required methods", () => {
    expect(() => assertImplementsBaseParser(makeMockParser(), "mock")).not.toThrow();
  });

  it("requires exactly detect/parse/validateStructure/normalize/recover", () => {
    expect(REQUIRED_METHODS).toEqual(
      ["detect", "parse", "validateStructure", "normalize", "recover"],
    );
  });

  it.each(REQUIRED_METHODS)("rejects a parser missing %s()", (method) => {
    const broken = makeMockParser({ [method]: undefined });
    expect(() => assertImplementsBaseParser(broken, "broken")).toThrow(
      new RegExp(`missing required method "${method}\\(\\)".*PARSE_CONTRACT_VIOLATION`),
    );
  });

  it("rejects non-object input", () => {
    expect(() => assertImplementsBaseParser(null, "nil")).toThrow(/PARSE_CONTRACT_VIOLATION/);
    expect(() => assertImplementsBaseParser(/** @type {any} */ ("x"), "str")).toThrow(/PARSE_CONTRACT_VIOLATION/);
  });

  it("rejects a non-boolean isAsync", () => {
    const broken = makeMockParser({ isAsync: /** @type {any} */ ("yes") });
    expect(() => assertImplementsBaseParser(broken, "broken")).toThrow(/isAsync.*boolean/);
  });

  it("rejects isAsync=true without parseAsync", () => {
    const broken = makeMockParser({ isAsync: true });
    expect(() => assertImplementsBaseParser(broken, "broken")).toThrow(/parseAsync/);
  });

  it("accepts isAsync=true paired with parseAsync (reserved for future Plugin Parsers)", () => {
    const ok = makeMockParser({ isAsync: true, parseAsync: async () => ({ fields: {} }) });
    expect(() => assertImplementsBaseParser(ok, "ok")).not.toThrow();
  });
});
