import { describe, it, expect } from "vitest";
import { UNM_SCHEMA_VERSION, SCHEMA_VERSIONS } from "../../core/unm/registry/schema-registry.js";

describe("UNM Schema Registry", () => {
  it("exposes the current schema version, matching the newest registered entry", () => {
    expect(UNM_SCHEMA_VERSION).toBe("1.0");
    expect(SCHEMA_VERSIONS.at(-1)?.version).toBe(UNM_SCHEMA_VERSION);
  });

  it("registry is frozen and ordered (append-only)", () => {
    expect(Object.isFrozen(SCHEMA_VERSIONS)).toBe(true);
    expect(SCHEMA_VERSIONS.length).toBeGreaterThanOrEqual(1);
  });
});
