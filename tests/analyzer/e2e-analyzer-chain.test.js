/**
 * Analyzer Engine — End-to-End chain test (06-ANALYZER_ENGINE §1.0-§1.2,
 * the last item of Phase 6 Core, 09-DEVELOPMENT_ROADMAP).
 *
 * Every other test file in `tests/analyzer/` builds its node with the
 * hand-built `createNode()` fixture helper and exercises exactly one module.
 * This file instead runs a REAL Parser-produced `UNMNode` — the same
 * detect -> extract -> normalize pipeline `urlParser` runs (04-PARSER_ENGINE
 * Stage 07/13.1/14, already covered by `tests/url/url-parser.test.js`) —
 * through all six §1.0-§1.5 Core modules in their natural dependency order:
 *   Completeness -> Protocol -> Network -> TLS -> Reality -> Security
 *
 * `AnalysisObject` (spec 05 §4) also has `riskScore`/`compatibilityScore`/
 * `cloudflareDetected`/etc.; none of those are produced by any module built
 * so far (§2's semi-definitive modules and the Final Report aggregation are
 * future phases), so this file only asserts the one frozen field the six
 * Core modules together are able to fill today: `securityScore`.
 */
import { describe, it, expect } from "vitest";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { VLESS_REALITY, TROJAN_WS, HY2, TUIC, WIREGUARD, SS_SIP002 } from "../url/fixtures.js";
import { analyzeCompleteness } from "../../core/analyzer/core/data-completeness.js";
import { analyzeProtocol } from "../../core/analyzer/core/protocol-analyzer.js";
import { analyzeNetwork } from "../../core/analyzer/core/network-analyzer.js";
import { analyzeTls } from "../../core/analyzer/core/tls-analyzer.js";
import { analyzeReality } from "../../core/analyzer/core/reality-analyzer.js";
import { analyzeSecurity } from "../../core/analyzer/core/security-analyzer.js";

/**
 * Real Parser pipeline (Stage 07 extract -> Stage 13.1/14 normalize) — the
 * exact path `urlParser.parse`/`.normalize` run; never a hand-built node.
 * @param {string} raw
 */
const parse = (raw) => normalizeUrl(parseUrl(raw));

/**
 * Thread each upstream verdict into the next explicitly — the composition
 * `analyzer.worker.js` (ADR-003) will eventually perform — instead of
 * letting every call recompute Completeness/TLS/Reality via its own
 * default parameters.
 * @param {import("../../core/types/unm").UNMNode} node
 */
function runChain(node) {
  const completeness = analyzeCompleteness(node);
  const protocol = analyzeProtocol(node);
  const network = analyzeNetwork(node);
  const tls = analyzeTls(node, completeness);
  const reality = analyzeReality(node, completeness, tls);
  const security = analyzeSecurity(node, completeness, tls, reality);
  return { completeness, protocol, network, tls, reality, security };
}

describe("Analyzer Engine — end-to-end chain (all six Phase 6 Core modules)", () => {
  it("VLESS + Reality + gRPC: a real Parser node with an implausible pbk and a missing alpn", () => {
    const node = parse(VLESS_REALITY);
    expect(node.nodeId).toBeTruthy(); // went through createNode() — a genuine Parser output
    expect(node.protocol).toBe("vless");

    const r = runChain(node);
    expect(r.protocol).toEqual({ protocol: "vless", recognized: true });
    expect(r.network).toMatchObject({ network: "grpc", compatible: true });
    expect(r.tls).toMatchObject({ applicable: true, coherent: true, knownFingerprint: true });
    // The fixture's pbk ("PUBKEY123") is placeholder test data, not a real
    // 43-char X25519 key — Reality Analyzer correctly flags it; alpn was
    // never set on this URL either.
    expect(r.reality.compatible).toBe(false);
    expect(r.reality.issues).toEqual(['pbk "PUBKEY123" is not a plausible X25519 public key']);
    expect(r.security.securityScore).toBe(87); // 100 - 8 (reality pbk issue) - 5 (alpn missing)
    expect(r.security.issues).toEqual([
      'pbk "PUBKEY123" is not a plausible X25519 public key',
      "alpn is missing — reduces the security score (no value to evaluate)",
    ]);
  });

  it("Trojan + TLS + WS: a real Parser node with no Reality layer and a missing alpn", () => {
    const node = parse(TROJAN_WS);
    const r = runChain(node);
    expect(r.protocol.recognized).toBe(true);
    expect(r.network.compatible).toBe(true);
    expect(r.tls).toMatchObject({ applicable: true, coherent: true });
    expect(r.reality).toMatchObject({ applicable: false, compatible: true });
    expect(r.security.securityScore).toBe(85); // 100 - 10 (tls transportBase) - 5 (alpn missing)
    expect(r.security.issues).toEqual(["alpn is missing — reduces the security score (no value to evaluate)"]);
  });

  it("Hysteria2 (self-transporting, the ADR-011 false-positive fix): a clean real Parser node scores 100", () => {
    const node = parse("hy2://hy2-pass@hy.example.com:8443#clean-hy2");
    expect(node.protocol).toBe("hysteria2");
    expect(node.security).toBe("none"); // structural default — normalize.js never sets it

    const r = runChain(node);
    expect(r.protocol.recognized).toBe(true);
    expect(r.network.compatible).toBe(true); // self-transporting -> tcp is the only supported transport
    expect(r.tls.applicable).toBe(false);
    expect(r.reality.applicable).toBe(false);
    expect(r.security.securityScore).toBe(100); // transportBase=0 for hysteria2 regardless of security:"none"
    expect(r.security.issues).toEqual([]);
  });

  it("Hysteria2 with a stray sni: transportBase stays 0, but the stray TLS field still costs 8", () => {
    // Proves the fix is scoped exactly to `security`'s own value, not a
    // blanket exemption for the protocol — a genuinely stray TLS-handshake
    // field on a self-transporting protocol is still a real coherence
    // problem, and the end-to-end chain still catches it.
    const node = parse(HY2); // shared fixture sets `sni=hy.example.com`
    const r = runChain(node);
    expect(r.tls.issues).toEqual(['sni is set but security is "none" (no TLS layer to use it)']);
    expect(r.security.securityScore).toBe(92); // 100 - 8 (the stray-sni TLS issue); transportBase still 0
  });

  it("composes without redundant recomputation: explicit threading equals the default-parameter chain", () => {
    const node = parse(VLESS_REALITY);
    const threaded = runChain(node);
    const selfComputed = analyzeSecurity(node); // recomputes completeness/tls/reality via its own defaults
    expect(selfComputed).toEqual(threaded.security);
  });

  it("every real Parser-produced node's verdicts are a shape AnalysisObject's frozen fields accept", () => {
    for (const raw of [VLESS_REALITY, TROJAN_WS, HY2, TUIC, WIREGUARD, SS_SIP002]) {
      const node = parse(raw);
      const { protocol, network, security } = runChain(node);
      expect(protocol.recognized).toBe(true); // every real Parser output names a known protocol
      expect(typeof network.compatible).toBe("boolean");
      expect(Number.isInteger(security.securityScore)).toBe(true);
      expect(security.securityScore).toBeGreaterThanOrEqual(0);
      expect(security.securityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(security.issues)).toBe(true);
    }
  });
});
