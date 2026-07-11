import { describe, it, expect } from "vitest";
import {
  ERROR_CODES, getErrorDef, makeDiagnostic, compareSeverity, maxSeverity,
} from "../../core/errors/registry.js";

describe("Error Code Registry", () => {
  it("every entry's key matches its .code and uses a known layer/severity", () => {
    const layers = new Set(["PRE", "DET", "PARSE", "REC", "VAL", "UNM"]);
    const severities = new Set(["info", "warning", "error", "critical"]);
    for (const [key, def] of Object.entries(ERROR_CODES)) {
      expect(def.code).toBe(key);
      expect(layers.has(def.layer)).toBe(true);
      expect(severities.has(def.severity)).toBe(true);
      expect(def.message.length).toBeGreaterThan(0);
    }
  });

  it("registry is frozen (codes are append-only via source edit)", () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });

  it("getErrorDef looks up by code", () => {
    expect(getErrorDef("VAL_PORT_OUT_OF_RANGE")?.severity).toBe("error");
    expect(getErrorDef("NOPE")).toBeUndefined();
  });

  it("makeDiagnostic resolves a registered code with context", () => {
    const d = makeDiagnostic("VAL_UUID_INVALID", { field: "uuid", detail: "abc" });
    expect(d.code).toBe("VAL_UUID_INVALID");
    expect(d.layer).toBe("VAL");
    expect(d.severity).toBe("error");
    expect(d.field).toBe("uuid");
    expect(d.detail).toBe("abc");
  });

  it("makeDiagnostic allows message override", () => {
    const d = makeDiagnostic("VAL_ALPN_INVALID", { message: "custom" });
    expect(d.message).toBe("custom");
  });

  it("makeDiagnostic throws on an unregistered code (a bug, not a guess)", () => {
    expect(() => makeDiagnostic("DOES_NOT_EXIST")).toThrow();
  });

  it("severity comparison + max", () => {
    expect(compareSeverity("critical", "info")).toBeGreaterThan(0);
    expect(compareSeverity("info", "warning")).toBeLessThan(0);
    expect(maxSeverity([])).toBeNull();
    expect(maxSeverity([
      makeDiagnostic("PARSE_UNKNOWN_FIELD"),
      makeDiagnostic("VAL_PORT_OUT_OF_RANGE"),
      makeDiagnostic("VAL_TLS_NO_SNI"),
    ])).toBe("error");
  });
});
