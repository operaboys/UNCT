/**
 * ui/dashboard/format.ts tests — mirrors tests/ui/analyzer/format.test.js's
 * structure for the Dashboard Screen's formatting module.
 */
import { describe, it, expect } from "vitest";
import {
  formatAverageScore,
  securityBadgeTier,
  formatRelativeTime,
  buildProtocolShareBars,
  PROTOCOL_ABBREVIATION,
  PROTOCOL_DISPLAY_NAME,
  SECURITY_TYPE_DISPLAY_NAME,
} from "../../../ui/dashboard/format.js";

describe("formatAverageScore", () => {
  it("rounds and formats a 0-100 average score with its scale", () => {
    expect(formatAverageScore(87)).toBe("87/100");
    expect(formatAverageScore(59.5)).toBe("60/100");
    expect(formatAverageScore(0)).toBe("0/100");
  });

  it("returns 'N/A' for null, never collapsing into a fabricated 0 (Rule 9)", () => {
    expect(formatAverageScore(null)).toBe("N/A");
    expect(formatAverageScore(null)).not.toBe(formatAverageScore(0));
  });
});

describe("PROTOCOL_ABBREVIATION", () => {
  it("covers all seven UNM protocols (05-UNIVERSAL_NODE_MODEL), not just the mockup's four", () => {
    expect(PROTOCOL_ABBREVIATION).toEqual({
      vless: "VL",
      vmess: "VM",
      trojan: "TR",
      shadowsocks: "SS",
      hysteria2: "HY",
      tuic: "TU",
      wireguard: "WG",
    });
  });
});

describe("PROTOCOL_DISPLAY_NAME", () => {
  it("uses real brand casing, not a generic capitalize-first-letter", () => {
    expect(PROTOCOL_DISPLAY_NAME).toEqual({
      vless: "VLESS",
      vmess: "VMess",
      trojan: "Trojan",
      shadowsocks: "Shadowsocks",
      hysteria2: "Hysteria2",
      tuic: "TUIC",
      wireguard: "WireGuard",
    });
  });
});

describe("SECURITY_TYPE_DISPLAY_NAME", () => {
  it("uses real brand casing (TLS all-caps, not 'Tls')", () => {
    expect(SECURITY_TYPE_DISPLAY_NAME).toEqual({ none: "None", tls: "TLS", reality: "Reality" });
  });
});

describe("securityBadgeTier", () => {
  it("is 'high' at and above the 70 threshold", () => {
    expect(securityBadgeTier(70)).toBe("high");
    expect(securityBadgeTier(94)).toBe("high");
    expect(securityBadgeTier(100)).toBe("high");
  });

  it("is 'mid' below the threshold", () => {
    expect(securityBadgeTier(69)).toBe("mid");
    expect(securityBadgeTier(61)).toBe("mid");
    expect(securityBadgeTier(0)).toBe("mid");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-03T12:00:00.000Z").getTime();

  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime(new Date(now - 30_000).toISOString(), now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelativeTime(new Date(now - 2 * 60_000).toISOString(), now)).toBe("2m ago");
    expect(formatRelativeTime(new Date(now - 59 * 60_000).toISOString(), now)).toBe("59m ago");
  });

  it("returns hours for under a day", () => {
    expect(formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe("3h ago");
  });

  it("returns days for a day or more", () => {
    expect(formatRelativeTime(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe("2d ago");
  });
});

describe("buildProtocolShareBars", () => {
  it("returns an empty array for an empty distribution", () => {
    expect(buildProtocolShareBars({})).toEqual([]);
  });

  it("computes percent OF THE TOTAL (not of the max, unlike Subscription Center's chart)", () => {
    const bars = buildProtocolShareBars({ vless: 94, vmess: 59, trojan: 44, shadowsocks: 50 });

    // 94+59+44+50 = 247 -> matches the approved reference's own worked example.
    expect(bars).toEqual([
      { protocol: "vless", count: 94, percent: 38 },
      { protocol: "shadowsocks", count: 50, percent: 20 },
      { protocol: "vmess", count: 59, percent: 24 },
      { protocol: "trojan", count: 44, percent: 18 },
    ].sort((a, b) => b.count - a.count));
  });

  it("sorts highest-count-first", () => {
    const bars = buildProtocolShareBars({ tuic: 1, vless: 5, trojan: 3 });
    expect(bars.map((b) => b.protocol)).toEqual(["vless", "trojan", "tuic"]);
  });

  it("percents sum to (approximately, after rounding) 100 for a full distribution", () => {
    const bars = buildProtocolShareBars({ a: 25, b: 25, c: 25, d: 25 });
    const sum = bars.reduce((s, b) => s + b.percent, 0);
    expect(sum).toBe(100);
  });
});
