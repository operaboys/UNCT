import { describe, it, expect } from "vitest";
import {
  isValidPort, isValidIPv4, isValidIPv6, isValidDomain, isValidAddress,
  isValidUUID, isValidHost, isValidPath, isValidAlpn, isKnownAlpn,
} from "../../core/validator/validators.js";

describe("field validators", () => {
  it("isValidPort", () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(443.5)).toBe(false);
    expect(isValidPort("443")).toBe(false);
  });

  it("isValidIPv4", () => {
    expect(isValidIPv4("192.168.1.1")).toBe(true);
    expect(isValidIPv4("255.255.255.255")).toBe(true);
    expect(isValidIPv4("256.1.1.1")).toBe(false);
    expect(isValidIPv4("01.2.3.4")).toBe(false); // leading zero
    expect(isValidIPv4("1.2.3")).toBe(false);
  });

  it("isValidIPv6", () => {
    expect(isValidIPv6("2001:db8::1")).toBe(true);
    expect(isValidIPv6("[2001:db8::1]")).toBe(true);
    expect(isValidIPv6("::1")).toBe(true);
    expect(isValidIPv6("1::2::3")).toBe(false);
    expect(isValidIPv6("example.com")).toBe(false);
  });

  it("isValidDomain", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("sub.example.co.uk")).toBe(true);
    expect(isValidDomain("-bad.com")).toBe(false);
    expect(isValidDomain("a..b")).toBe(false);
    expect(isValidDomain("")).toBe(false);
  });

  it("isValidAddress accepts ip or domain", () => {
    expect(isValidAddress("1.1.1.1")).toBe(true);
    expect(isValidAddress("2001:db8::1")).toBe(true);
    expect(isValidAddress("example.com")).toBe(true);
    expect(isValidAddress("not a host")).toBe(false);
  });

  it("isValidUUID", () => {
    expect(isValidUUID("b831381d-6324-4d53-ad4f-8cda48b30811")).toBe(true);
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it("isValidPath / isValidHost", () => {
    expect(isValidPath("/ws")).toBe(true);
    expect(isValidPath("ws")).toBe(false);
    expect(isValidPath("/ b")).toBe(false);
    expect(isValidHost("cdn.example.com")).toBe(true);
    expect(isValidHost("bad host")).toBe(false);
  });

  it("isValidAlpn / isKnownAlpn", () => {
    expect(isValidAlpn(["h2", "http/1.1"])).toBe(true);
    expect(isValidAlpn([])).toBe(false);
    expect(isValidAlpn("h2")).toBe(false);
    expect(isKnownAlpn(["h2", "http/1.1"])).toBe(true);
    expect(isKnownAlpn(["h2", "weird-proto"])).toBe(false);
  });
});
