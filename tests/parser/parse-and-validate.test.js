/**
 * parseAndValidate (core/parser/parse-and-validate.js) — the synchronous
 * main-thread "raw text -> UNMNode[]" pipeline the Converter Screen
 * (ui/converter/) drives directly, without a real Worker. Exercises the
 * REAL registered parsers (not mocks) end to end, same as
 * tests/worker/parser-worker.test.js does for the Worker-wrapped path —
 * the two paths must agree on parserName/recovered/node count, differing
 * only in whether the result is flattened for postMessage.
 */
import { describe, it, expect } from "vitest";
import { parseAndValidate } from "../../core/parser/parse-and-validate.js";
import { SINGLE_VMESS } from "../singbox/fixtures.js";

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";

describe("parseAndValidate", () => {
  it("parses a clean VLESS URL into a real, validated UNMNode", () => {
    const raw = `vless://${UUID}@a.example.com:443?security=tls&sni=a.example.com#A`;
    const { parserName, recovered, nodes } = parseAndValidate(raw);

    expect(parserName).toBe("url");
    expect(recovered).toBe(false);
    expect(nodes).toHaveLength(1);
    const [node] = nodes;
    expect(node.protocol).toBe("vless");
    expect(node.address).toBe("a.example.com");
    expect(node.port).toBe(443);
    // Real nested UNMNode, not parser.worker.js's flattened wire format.
    expect(node.validation).toBeDefined();
    expect(node.validation.overallValid).toBe(true);
    expect(node.metadata).toBeDefined();
    expect(Object.isFrozen(node)).toBe(true);
  });

  it("parses a multi-line subscription into several nodes", () => {
    const raw = [
      `vless://${UUID}@a.example.com:443?security=tls&sni=a.example.com#A`,
      "trojan://tjpass@b.example.com:443?security=tls&sni=b.example.com#B",
    ].join("\n");
    const { parserName, nodes } = parseAndValidate(raw);

    expect(parserName).toBe("subscription");
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.protocol)).toEqual(["vless", "trojan"]);
  });

  it("throws Unknown Format for input no registered parser recognizes", () => {
    expect(() => parseAndValidate("not a config at all, just prose"))
      .toThrow(/Unknown Format/);
  });
});

describe("parseAndValidate — metadata.alternativeCandidates (ADR-028)", () => {
  it("is [] when only one parser reached the confidence threshold (the honest single-candidate case)", () => {
    const raw = `vless://${UUID}@a.example.com:443?security=tls&sni=a.example.com#A`;
    const { nodes } = parseAndValidate(raw);

    expect(nodes[0].metadata.alternativeCandidates).toEqual([]);
  });

  it("lists every threshold-passing candidate EXCEPT the winner, for a real config two real parsers both score", () => {
    // A real sing-box config whose sole outbound also happens to carry a
    // top-level `outbounds` key — sing-box wins at 95 (real shape match),
    // but Xray's own detector legitimately scores it 55 too (it sees
    // `config.outbounds` but no valid protocol/settings Xray outbound
    // inside it — core/parser/xray/detect.js's own documented behavior,
    // not a contrived mock).
    const { parserName, nodes } = parseAndValidate(SINGLE_VMESS);

    expect(parserName).toBe("singbox");
    expect(nodes[0].metadata.alternativeCandidates).toEqual([{ name: "xray", confidence: 55 }]);
    // The winner's own score is untouched — a separate, independent field.
    expect(nodes[0].metadata.confidence).toBe(95);
  });

  it("every node in a multi-node batch gets the same alternativeCandidates (detection ran once, on the raw input)", () => {
    const raw = [
      `vless://${UUID}@a.example.com:443?security=tls&sni=a.example.com#A`,
      "trojan://tjpass@b.example.com:443?security=tls&sni=b.example.com#B",
    ].join("\n");
    const { nodes } = parseAndValidate(raw);

    expect(nodes).toHaveLength(2);
    expect(nodes[0].metadata.alternativeCandidates).toEqual(nodes[1].metadata.alternativeCandidates);
  });
});
