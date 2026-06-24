import { describe, it, expect } from "vitest";
import {
  subscriptionParser, registerSubscriptionParser, parseSubscription,
  detectSubscription, decodeSubscription, extractSubscription,
  normalizeSubscription, recoverSubscription, splitAndDedupe,
} from "../../core/parser/subscription/index.js";
import { createParserFactory } from "../../core/parser/factory.js";
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

describe("SubscriptionParser.normalize — single-node contract compliance", () => {
  it("returns the first node for the contract method", () => {
    const node = subscriptionParser.normalize(extractSubscription(PLAIN_MIXED));
    expect(node.protocol).toBe("vless");
  });
  it("validateStructure passes when lines exist, fails when empty", () => {
    expect(subscriptionParser.validateStructure(extractSubscription(PLAIN_MIXED)).overallValid).toBe(true);
    expect(subscriptionParser.validateStructure({ fields: { lines: [] } }).overallValid).toBe(false);
  });
});

describe("SubscriptionParser — advisory hints + normalizeAll alias", () => {
  it("exposes advisory-only hints (12 §2.1)", () => {
    expect(subscriptionParser.formatVersion?.()).toBe("subscription");
    expect(subscriptionParser.metadataHint?.()).toEqual({ parser: "SubscriptionParser" });
  });
  it("normalizeAll is the multi-node API on the parser object", () => {
    const { nodes } = subscriptionParser.normalizeAll(extractSubscription(PLAIN_MIXED));
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
});
