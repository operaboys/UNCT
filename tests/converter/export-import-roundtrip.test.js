/**
 * Export -> Format Detection -> Parse round-trip, through the REAL path a
 * user drives: paste an Exporter's actual, complete output back into the
 * Converter Screen. This is deliberately NOT what to-clash.test.js /
 * to-singbox.test.js / to-xray.test.js / to-url.test.js already cover --
 * those round-trip through their OWN format's parser directly
 * (`parseClash(toClash(node))`, etc.), never through `parseAndValidate`'s
 * real Format Detection (`core/parser/factory.js`'s `parseWithFallback`,
 * Highest-Confidence-Wins across all six parsers) that a pasted config
 * actually goes through. A bug in detection itself (e.g. one format's
 * exported shape scoring low/wrong on another parser's detector) would not
 * be caught by any existing test, since none of them exercise detection —
 * this file pins exactly that gap, manually verified across 6 protocols x 3
 * formats before this test existed.
 *
 * For each of the 7 supported protocols, each of the 4 real Exporter
 * functions (`core/exporter/index.js`'s `exportTxt`/`exportClashYaml`/
 * `exportSingboxJson`/`exportXrayJson` -- the actual user-facing artifacts,
 * not the lower-level per-node `to-*.js` serializers) is run on a single
 * node, and its COMPLETE output is fed straight into `parseAndValidate`
 * (detection + parse + normalize + validate, exactly Converter Screen's own
 * pipeline). Each format's own `*_SUPPORTED_PROTOCOLS` constant (the same
 * ADR-012 single source of truth `convertBatch`/`buildConversion` use) is
 * reused here too, so a documented skip (Xray has no shape for Hysteria2/
 * TUIC/WireGuard) is asserted as a skip-with-reason, never attempted as a
 * parse.
 *
 * @typedef {import("../../core/types/unm").UNMNode} UNMNode
 */
import { describe, it, expect } from "vitest";
import { createNode } from "../../core/unm/create-node.js";
import { parseAndValidate } from "../../core/parser/parse-and-validate.js";
import { exportTxt, exportClashYaml, exportSingboxJson, exportXrayJson } from "../../core/exporter/index.js";
import { URL_SUPPORTED_PROTOCOLS } from "../../core/converter/to-url.js";
import { XRAY_SUPPORTED_PROTOCOLS } from "../../core/converter/to-xray.js";
import { SINGBOX_SUPPORTED_PROTOCOLS } from "../../core/converter/to-singbox.js";
import { CLASH_SUPPORTED_PROTOCOLS } from "../../core/converter/to-clash.js";

/**
 * The comparable "core" of a node — everything except fields that
 * legitimately differ between two independent parses: the system-generated
 * identity/timestamps, and parse-provenance `metadata` (which nests
 * ADR-028's `alternativeCandidates`) / `validation`, and `sourceType`
 * itself -- which here is expected to differ across formats BY DESIGN (the
 * whole point of this file is round-tripping ONE base node through 4
 * DIFFERENT wire formats, so the reconstructed `sourceType` correctly
 * reflects whichever one was actually detected, e.g. "clash-meta-yaml" vs
 * "xray-json", not the synthetic value the fixture below happens to be
 * tagged with).
 * @param {UNMNode} node
 */
function core(node) {
  const { nodeId, createdAt, updatedAt, metadata, validation, sourceType, ...rest } = node;
  return rest;
}

const UUID_A = "b831381d-6324-4d53-ad4f-8cda48b30811";
const UUID_B = "550e8400-e29b-41d4-a716-446655440000";

/** @type {{ name: string, node: Readonly<UNMNode> }[]} */
const FIXTURES = [
  { name: "vless (Reality + gRPC)", node: createNode({
    sourceType: "vless-url", protocol: "vless", address: "grpc.example.com", port: 443,
    uuid: UUID_A, network: "grpc", security: "reality", sni: "www.microsoft.com",
    pbk: "xUre2Y0p_publickey", sid: "ab12", flow: "xtls-rprx-vision", serviceName: "GunService",
    remark: "vless-core",
  }) },
  { name: "vmess (WS + TLS, Persian/emoji remark)", node: createNode({
    sourceType: "vmess-url", protocol: "vmess", address: "vm.example.com", port: 443,
    uuid: UUID_B, network: "ws", security: "tls", sni: "vm.example.com",
    host: "vm.example.com", path: "/vmess", remark: "کانفیگ ویژه من 🚀",
  }) },
  { name: "trojan (WS + TLS, percent-encode-worthy password)", node: createNode({
    sourceType: "trojan-url", protocol: "trojan", address: "tj.example.com", port: 443,
    password: "P@ss #1 word/50%+off=yes? رمز", network: "ws", security: "tls",
    sni: "tj.example.com", path: "/tj", remark: "trojan-special-pass",
  }) },
  { name: "shadowsocks (bracketed IPv6 address, special-char password)", node: createNode({
    sourceType: "ss-url", protocol: "shadowsocks", address: "2001:db8::1", port: 8388,
    password: "پسورد#1 with spaces&symbols%", method: "aes-256-gcm", network: "tcp", security: "none",
    remark: "ss-ipv6-🔒",
  }) },
  { name: "hysteria2 (QUIC + TLS, special-char password)", node: createNode({
    sourceType: "hysteria2-url", protocol: "hysteria2", address: "hy.example.com", port: 443,
    password: "Hy@Pass #42 %encoded%", network: "quic", security: "tls", sni: "hy.example.com",
    remark: "hysteria2-node",
  }) },
  { name: "tuic (QUIC + TLS, Persian remark)", node: createNode({
    sourceType: "tuic-url", protocol: "tuic", address: "tuic.example.com", port: 443,
    uuid: UUID_B, password: "Tuic Pass&More=1", network: "quic", security: "tls",
    sni: "tuic.example.com", remark: "کانفیگ تویک من",
  }) },
  { name: "wireguard (key material under extensions.wireguard)", node: createNode({
    sourceType: "wireguard-config", protocol: "wireguard", address: "wg.example.com", port: 51820,
    network: "tcp", security: "none", remark: "wg-node",
    extensions: { wireguard: {
      privateKey: "PRIVKEY123", publicKey: "PEERKEY456", presharedKey: "PSK789",
      allowedIPs: ["10.0.0.2/32"], mtu: 1420,
    } },
  }) },
];

const FORMATS = [
  { label: "Links/URL (exportTxt)", protocols: URL_SUPPORTED_PROTOCOLS, exportOne: (/** @type {UNMNode} */ n) => exportTxt([n]) },
  { label: "Clash YAML (exportClashYaml)", protocols: CLASH_SUPPORTED_PROTOCOLS, exportOne: (/** @type {UNMNode} */ n) => exportClashYaml([n]) },
  { label: "Sing-box JSON (exportSingboxJson)", protocols: SINGBOX_SUPPORTED_PROTOCOLS, exportOne: (/** @type {UNMNode} */ n) => exportSingboxJson([n]) },
  { label: "Xray JSON (exportXrayJson)", protocols: XRAY_SUPPORTED_PROTOCOLS, exportOne: (/** @type {UNMNode} */ n) => exportXrayJson([n]) },
];

describe("Export -> Format Detection -> Parse round-trip (the real Converter Screen paste path)", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      for (const format of FORMATS) {
        const supported = format.protocols.includes(fixture.node.protocol);

        if (!supported) {
          it(`is a documented skip (not a parse attempt) in ${format.label}`, () => {
            const { content, skipped } = format.exportOne(fixture.node);
            expect(content).toBeDefined();
            expect(skipped).toHaveLength(1);
            expect(skipped[0].protocol).toBe(fixture.node.protocol);
            expect(skipped[0].reason).toMatch(/not supported/i);
          });
          continue;
        }

        it(`round-trips losslessly through ${format.label} via real Format Detection`, () => {
          const { content, skipped } = format.exportOne(fixture.node);
          expect(skipped).toHaveLength(0);

          const { nodes } = parseAndValidate(content);
          expect(nodes).toHaveLength(1);
          expect(core(nodes[0])).toEqual(core(fixture.node));
        });
      }
    });
  }
});
