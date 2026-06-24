import { describe, it, expect } from "vitest";
import { createParserFactory, UNKNOWN_FORMAT_THRESHOLD } from "../../core/parser/factory.js";
import { makeMockParser } from "../setup/mock-parser.js";

describe("ParserFactory — registration (12 §6.1)", () => {
  it("registers and retrieves a parser by name", () => {
    const factory = createParserFactory();
    const parser = makeMockParser();
    factory.register("mock", parser);
    expect(factory.get("mock")).toBe(parser);
    expect(factory.list()).toEqual(["mock"]);
  });

  it("rejects a non-empty-string name", () => {
    const factory = createParserFactory();
    expect(() => factory.register("", makeMockParser())).toThrow(/non-empty string/);
  });

  it("rejects registering the same name twice", () => {
    const factory = createParserFactory();
    factory.register("mock", makeMockParser());
    expect(() => factory.register("mock", makeMockParser())).toThrow(/already registered/);
  });

  it("rejects a parser that violates the BaseParser contract", () => {
    const factory = createParserFactory();
    expect(() => factory.register("broken", makeMockParser({ parse: undefined })))
      .toThrow(/PARSE_CONTRACT_VIOLATION/);
  });

  it("get() throws for an unregistered name", () => {
    const factory = createParserFactory();
    expect(() => factory.get("missing")).toThrow(/no parser registered/);
  });
});

describe("ParserFactory — detection (12 §4, Highest Confidence Wins)", () => {
  it("ranks candidates by descending confidence", () => {
    const factory = createParserFactory();
    factory.register("low", makeMockParser({ detect: () => 10 }));
    factory.register("high", makeMockParser({ detect: () => 90 }));
    factory.register("mid", makeMockParser({ detect: () => 50 }));

    expect(factory.detectCandidates("input")).toEqual([
      { name: "high", confidence: 90 },
      { name: "mid", confidence: 50 },
      { name: "low", confidence: 10 },
    ]);
  });

  it("selectParser returns the highest-confidence parser when above threshold", () => {
    const factory = createParserFactory();
    const winner = makeMockParser({ detect: () => 97 });
    factory.register("winner", winner);
    factory.register("loser", makeMockParser({ detect: () => 41 }));

    const result = factory.selectParser("input");
    expect(result?.name).toBe("winner");
    expect(result?.parser).toBe(winner);
  });

  it("selectParser returns null (Unknown Format) when nothing clears the threshold", () => {
    const factory = createParserFactory();
    factory.register("weak", makeMockParser({ detect: () => UNKNOWN_FORMAT_THRESHOLD - 1 }));
    expect(factory.selectParser("input")).toBeNull();
  });
});

describe("ParserFactory — recovery fallback chain (12 §5)", () => {
  it("parses with the primary (highest-confidence) parser when it succeeds", () => {
    const factory = createParserFactory();
    factory.register("primary", makeMockParser({
      detect: () => 95, parse: () => ({ fields: { ok: true } }),
    }));
    factory.register("secondary", makeMockParser({ detect: () => 60 }));

    const result = factory.parseWithFallback("input");
    expect(result).toEqual({ name: "primary", extraction: { fields: { ok: true } }, recovered: false });
  });

  it("falls back to the primary's own recover() when parse() throws", () => {
    const factory = createParserFactory();
    factory.register("primary", makeMockParser({
      detect: () => 95,
      parse: () => { throw new Error("broken JSON"); },
      recover: () => ({ fields: { recovered: true } }),
    }));

    const result = factory.parseWithFallback("input");
    expect(result).toEqual({ name: "primary", extraction: { fields: { recovered: true } }, recovered: true });
  });

  it("moves to the secondary candidate when the primary fails parse() and recover()", () => {
    const factory = createParserFactory();
    factory.register("primary", makeMockParser({
      detect: () => 95,
      parse: () => { throw new Error("broken"); },
      recover: () => null,
    }));
    factory.register("secondary", makeMockParser({
      detect: () => 70, parse: () => ({ fields: { from: "secondary" } }),
    }));

    const result = factory.parseWithFallback("input");
    expect(result).toEqual({ name: "secondary", extraction: { fields: { from: "secondary" } }, recovered: false });
  });

  it("throws the last error when every candidate fails parse() and recover()", () => {
    const factory = createParserFactory();
    factory.register("primary", makeMockParser({
      detect: () => 95,
      parse: () => { throw new Error("primary failed"); },
      recover: () => null,
    }));
    factory.register("secondary", makeMockParser({
      detect: () => 70,
      parse: () => { throw new Error("secondary failed"); },
      recover: () => null,
    }));

    expect(() => factory.parseWithFallback("input")).toThrow("secondary failed");
  });

  it("throws Unknown Format when no candidate reaches the confidence threshold", () => {
    const factory = createParserFactory();
    factory.register("weak", makeMockParser({ detect: () => 10 }));
    expect(() => factory.parseWithFallback("input")).toThrow(/Unknown Format/);
  });
});
