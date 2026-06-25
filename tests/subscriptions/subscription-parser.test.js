import { describe, it, expect } from "vitest";
import {
  subscriptionParser, registerSubscriptionParser, parseSubscription,
  detectSubscription, decodeSubscription, extractSubscription,
  normalizeSubscription, recoverSubscription, splitAndDedupe,
} from "../../core/parser/subscription/index.js";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { registerUrlParser } from "../../core/parser/url/index.js";
import { registerXrayParser } from "../../core/parser/xray/index.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import {
  LINE_VLESS, LINE_TROJAN, PLAIN_MIXED, BASE64_MIXED, PLAIN_WITH_DUPLICATE,
  PLAIN_WITH_JUNK, PLAIN_NO_UUID, BASE64_DIRTY, EMPTY, BROKEN_BASE64,
} from "./fixtures.js";

describe("SubscriptionParser — BaseParser contract", () => {
  it("implements the five required methods", () => {
    for (const m of ["detect", "parse", "validateStructure", "normalize", "recover"]) {
      expect(typeof (/** @type {any} */ (subscriptionParser)[m])).toBe("function");
    }
  });
});

describe("SubscriptionParser.detect (Stage 02)", () => {
  it("scores a multi-line plain list and a Base64 blob highly", () => {
    expect(detectSubscription(PLAIN_MIXED)).toBe(85);
    expect(detectSubscription(BASE64_MIXED)).toBe(90);
  });
  it("defers a single URL to the URL parser, and ignores empty input", () => {
    expect(detectSubscription(LINE_VLESS)).toBe(0);
    expect(detectSubscription("")).toBe(0);
  });
});

describe("SubscriptionParser.detect — lightly-polluted Base64 tolerance (ADR-009)", () => {
  it("scores a Base64 blob with a few stray injected characters at mid confidence", () => {
    const score = detectSubscription(BASE64_DIRTY);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThan(90);
  });
  it("rejects Base64 that decodes to no URLs even after sanitizing (no false positive)", () => {
    expect(detectSubscription(BROKEN_BASE64)).toBe(0);
  });
});

describe("Subscription decode (Stage 08 Auto Decode)", () => {
  it("decodes a Base64 blob to text", () => {
    const r = decodeSubscription(BASE64_MIXED);
    expect(r.encoding).toBe("base64");
    expect(r.text).toContain("vless://");
  });
  it("passes plain text through unchanged", () => {
    const r = decodeSubscription(PLAIN_MIXED);
    expect(r.encoding).toBe("plain");
  });
  it("flags an empty subscription", () => {
    expect(decodeSubscription(EMPTY).empty).toBe(true);
  });
  it("flags a broken Base64 payload (looks base64, decodes to no URLs)", () => {
    expect(decodeSubscription(BROKEN_BASE64).brokenBase64).toBe(true);
  });
});

describe("Subscription Validation runs BEFORE Split/Merge (03 §2.1)", () => {
  it("rejects an empty subscription", () => {
    expect(() => extractSubscription(EMPTY)).toThrow(/PARSE_EMPTY_SUBSCRIPTION/);
  });
  it("rejects a broken Base64 subscription", () => {
    expect(() => extractSubscription(BROKEN_BASE64)).toThrow(/PRE_BROKEN_BASE64/);
  });
  it("detects and removes duplicate payload lines", () => {
    const ext = extractSubscription(PLAIN_WITH_DUPLICATE);
    expect(ext.fields.report).toMatchObject({ totalLines: 3, uniqueLines: 2, duplicateCount: 1 });
    expect(ext.warnings?.some((w) => w.startsWith("PARSE_DUPLICATE_PAYLOAD"))).toBe(true);
  });
  it("splitAndDedupe keeps only URL lines and counts duplicates", () => {
    const r = splitAndDedupe(`${LINE_VLESS}\n# comment\n${LINE_VLESS}\n${LINE_TROJAN}`);
    expect(r.lines).toEqual([LINE_VLESS, LINE_TROJAN]);
    expect(r.duplicateCount).toBe(1);
  });
});

describe("SubscriptionParser — expansion reuses the URL parser (Stage 08)", () => {
  it("expands a plain mixed-protocol subscription into N nodes", () => {
    const { nodes, report } = parseSubscription(PLAIN_MIXED);
    expect(nodes.map((n) => n.protocol)).toEqual(["vless", "trojan", "vmess", "shadowsocks"]);
    expect(report).toMatchObject({ parsed: 4, failed: 0 });
  });
  it("expands the equivalent Base64 subscription identically", () => {
    const { nodes, report } = parseSubscription(BASE64_MIXED);
    expect(nodes).toHaveLength(4);
    expect(report.encoding).toBe("base64");
  });
  it("skips broken/non-URL lines and reports failures without throwing", () => {
    const { nodes, report } = parseSubscription(PLAIN_WITH_JUNK);
    // valid: vless + trojan; broken vmess fails; comment/junk are not URL lines
    expect(nodes.map((n) => n.protocol).sort()).toEqual(["trojan", "vless"]);
    expect(report.failed).toBe(1);
  });
  it("every produced node validates through the Validation Engine", () => {
    const { nodes } = parseSubscription(PLAIN_MIXED);
    for (const node of nodes) {
      expect(applyValidation(node).validation.overallValid).toBe(true);
    }
  });
});

describe("SubscriptionParser — never fabricates credentials (Stage 11)", () => {
  it("a line without a uuid yields an INVALID node, not an invented one", () => {
    const { nodes } = parseSubscription(PLAIN_NO_UUID);
    const bad = nodes.find((n) => n.address === "nouuid.example.com");
    expect(bad).toBeDefined();
    expect(bad?.uuid).toBeUndefined();
    expect(applyValidation(/** @type {any} */ (bad)).validation.overallValid).toBe(false);
  });
});

describe("SubscriptionParser — recovery (Stage 10/11)", () => {
  it("sanitizes a Base64 blob with stray junk and recovers the lines", () => {
    const extraction = recoverSubscription(BASE64_DIRTY);
    expect(extraction).not.toBeNull();
    const { nodes } = normalizeSubscription(/** @type {any} */ (extraction));
    expect(nodes.length).toBeGreaterThanOrEqual(3);
  });
  it("keeps only the valid URL lines when the rest is junk", () => {
    const extraction = recoverSubscription(PLAIN_WITH_JUNK);
    expect(extraction).not.toBeNull();
    expect(/** @type {any} */ (extraction).fields.lines).toContain(LINE_VLESS);
  });
  it("returns null when nothing usable can be recovered", () => {
    expect(recoverSubscription("")).toBeNull();
    expect(recoverSubscription("just random words, no urls")).toBeNull();
  });
});

describe("SubscriptionParser.normalize — refuses to lose data (ADR-008, Rule 9)", () => {
  it("throws loudly instead of silently returning only the first node", () => {
    expect(() => subscriptionParser.normalize(extractSubscription(PLAIN_MIXED)))
      .toThrow(/normalizeMany|ANTI_CHAOS Rule 9|ADR-008/);
  });
  it("validateStructure passes when lines exist, fails when empty", () => {
    expect(subscriptionParser.validateStructure(extractSubscription(PLAIN_MIXED)).overallValid).toBe(true);
    expect(subscriptionParser.validateStructure({ fields: { lines: [] } }).overallValid).toBe(false);
  });
});

describe("SubscriptionParser — advisory hints + normalizeMany (ADR-008)", () => {
  it("exposes advisory-only hints (12 §2.1)", () => {
    expect(subscriptionParser.formatVersion?.()).toBe("subscription");
    expect(subscriptionParser.metadataHint?.()).toEqual({ parser: "SubscriptionParser" });
  });
  it("declares producesMany and exposes normalizeMany as the multi-node API", () => {
    expect(subscriptionParser.producesMany).toBe(true);
    const nodes = subscriptionParser.normalizeMany?.(extractSubscription(PLAIN_MIXED));
    expect(nodes).toHaveLength(4);
  });
});

describe("SubscriptionParser — end-to-end through ParserFactory", () => {
  it("is selected over URL/Xray for a multi-line list (Highest Confidence Wins)", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);
    registerUrlParser(factory);
    registerSubscriptionParser(factory);

    expect(factory.selectParser(PLAIN_MIXED)?.name).toBe("subscription");
    expect(factory.selectParser(BASE64_MIXED)?.name).toBe("subscription");
    // a single URL still goes to the URL parser
    expect(factory.selectParser(LINE_VLESS)?.name).toBe("url");
    expect(factory.list().sort()).toEqual(["subscription", "url", "xray"]);
  });

  it("recovers a lightly-polluted Base64 subscription end-to-end through the factory fallback chain (ADR-009)", () => {
    // detect() must score BASE64_DIRTY >= UNKNOWN_FORMAT_THRESHOLD so the
    // subscription parser is even offered as a candidate; parse() then throws
    // on the broken Base64, and recover() sanitizes it (already covered by the
    // direct recoverSubscription() unit test above) — this proves the chain.
    const factory = createParserFactory();
    registerSubscriptionParser(factory);
    const { name, extraction, recovered } = factory.parseWithFallback(BASE64_DIRTY);
    expect(name).toBe("subscription");
    expect(recovered).toBe(true);
    const nodes = normalizeAll(factory.get(name), extraction).map(applyValidation);
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    expect(nodes.every((n) => n.validation.overallValid)).toBe(true);
  });

  it("normalizeAll() safely expands either parser kind to UNMNode[] (ADR-008)", () => {
    const factory = createParserFactory();
    registerUrlParser(factory);
    registerSubscriptionParser(factory);

    // multi-node: subscription -> every node
    const sub = factory.selectParser(PLAIN_MIXED);
    if (!sub) throw new Error("expected subscription parser");
    expect(normalizeAll(sub.parser, sub.parser.parse(PLAIN_MIXED))).toHaveLength(4);

    // single-node: url -> a one-element array (no special-casing by the caller)
    const url = factory.selectParser(LINE_VLESS);
    if (!url) throw new Error("expected url parser");
    expect(normalizeAll(url.parser, url.parser.parse(LINE_VLESS))).toHaveLength(1);
  });
});
