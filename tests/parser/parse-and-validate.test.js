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
