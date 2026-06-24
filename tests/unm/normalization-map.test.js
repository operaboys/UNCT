import { describe, it, expect } from "vitest";
import {
  NETWORK_TYPE_MAP, SECURITY_TYPE_MAP, PROTOCOL_MAP, normalizeValue,
} from "../../core/unm/mapper/normalization-map.js";
import { isNetworkType, isSecurityType, isProtocol } from "../../core/unm/schema/enums.js";

describe("Normalization Mapping Table (Stage 13.1)", () => {
  it("maps synonyms to canonical network types", () => {
    expect(normalizeValue(NETWORK_TYPE_MAP, "websocket")).toBe("ws");
    expect(normalizeValue(NETWORK_TYPE_MAP, "WS")).toBe("ws");
    expect(normalizeValue(NETWORK_TYPE_MAP, " httpupgrade ")).toBe("http-upgrade");
    expect(normalizeValue(NETWORK_TYPE_MAP, "splithttp")).toBe("xhttp");
  });

  it("maps security synonyms", () => {
    expect(normalizeValue(SECURITY_TYPE_MAP, "")).toBe("none");
    expect(normalizeValue(SECURITY_TYPE_MAP, "XTLS")).toBe("reality");
  });

  it("maps protocol synonyms", () => {
    expect(normalizeValue(PROTOCOL_MAP, "ss")).toBe("shadowsocks");
    expect(normalizeValue(PROTOCOL_MAP, "hy2")).toBe("hysteria2");
    expect(normalizeValue(PROTOCOL_MAP, "wg")).toBe("wireguard");
  });

  it("returns undefined for unmapped values (caller handles default + warning)", () => {
    expect(normalizeValue(NETWORK_TYPE_MAP, "carrier-pigeon")).toBeUndefined();
    expect(normalizeValue(NETWORK_TYPE_MAP, 42)).toBeUndefined();
  });

  it("every mapped value is itself a canonical enum member", () => {
    for (const v of Object.values(NETWORK_TYPE_MAP)) expect(isNetworkType(v)).toBe(true);
    for (const v of Object.values(SECURITY_TYPE_MAP)) expect(isSecurityType(v)).toBe(true);
    for (const v of Object.values(PROTOCOL_MAP)) expect(isProtocol(v)).toBe(true);
  });
});
