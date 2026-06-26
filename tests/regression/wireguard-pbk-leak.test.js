/**
 * Regression — WireGuard's public key must never leak onto the frozen UNM
 * core as `pbk` (ADR-007 / 05-UNIVERSAL_NODE_MODEL §8).
 *
 * The bug: every WireGuard-aware normalizer (url, singbox, clash) ran the
 * shared Priority Chain for `pbk` (whose synonyms include `publicKey`/
 * `public_key`) unconditionally. A WireGuard config carries its OWN public
 * key under exactly those names, so it was resolved onto `node.pbk` — a
 * Reality-only field — and a bogus `publicKey -> pbk` entry was written into
 * `metadata.originalMappings`. WireGuard keys belong solely under
 * `extensions.wireguard` (ADR-007); they are not Reality credentials.
 *
 * The fix skips the pbk/sid chains when `protocol === "wireguard"` in all
 * three parsers. This test feeds a real WireGuard config that explicitly
 * includes the pbk-chain synonym through each parser and asserts:
 *   - `node.pbk` and `node.sid` are always undefined,
 *   - the public key is present ONLY at `extensions.wireguard.publicKey`,
 *   - no `publicKey -> pbk` mapping pollutes `originalMappings`.
 * A Reality control node confirms the guard is scoped to WireGuard and does
 * not touch genuine `pbk`/`sid` handling.
 */
import { describe, it, expect } from "vitest";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { parseSingBox, normalizeManySingBox } from "../../core/parser/singbox/index.js";
import { parseClash, normalizeManyClash } from "../../core/parser/clash/index.js";

/** WireGuard via URL: `publickey` is the URL synonym (extract -> publicKey). */
const WG_URL =
  "wireguard://PRIVKEY@wg.example.com:51820?publickey=PEERKEY&presharedkey=PSK" +
  "&allowedips=0.0.0.0/0&mtu=1420#wg-url";

/** WireGuard via sing-box, with a stray top-level `public_key` (pbk-chain synonym). */
const WG_SINGBOX = JSON.stringify({
  outbounds: [
    {
      type: "wireguard", tag: "wg-sb", server: "wg.example.com", server_port: 51820,
      private_key: "PRIVKEY", peer_public_key: "PEERKEY", public_key: "PEERKEY",
      pre_shared_key: "PSK", mtu: 1420, local_address: ["10.0.0.2/32"],
    },
  ],
});

/** WireGuard via Clash: `public-key` (extract -> public_key, the real-world case). */
const WG_CLASH = `proxies:
  - name: wg-clash
    type: wireguard
    server: wg.example.com
    port: 51820
    private-key: PRIVKEY
    public-key: PEERKEY
    pre-shared-key: PSK
    ip: 10.0.0.2/32
    mtu: 1420
`;

/**
 * @param {string} label
 * @param {import("../../core/types/unm").UNMNode} node
 */
function assertNoPbkLeak(label, node) {
  expect(node.protocol, label).toBe("wireguard");
  // (1) the Reality-only core fields stay empty
  expect(node.pbk, `${label}: node.pbk`).toBeUndefined();
  expect(node.sid, `${label}: node.sid`).toBeUndefined();
  // (2) the public key lives ONLY under the WireGuard extension namespace
  const wg = /** @type {Record<string, unknown> | undefined} */ (node.extensions?.wireguard);
  expect(wg?.publicKey, `${label}: extensions key`).toBe("PEERKEY");
  // (3) no bogus synonym mapping was recorded
  expect(node.metadata.originalMappings, `${label}: originalMappings`).not.toHaveProperty("publicKey");
  expect(node.metadata.originalMappings, `${label}: originalMappings`).not.toHaveProperty("public_key");
}

describe("Regression — WireGuard public key never leaks to UNM core pbk (ADR-007)", () => {
  it("URLParser routes the WG public key to extensions only", () => {
    assertNoPbkLeak("url", normalizeUrl(parseUrl(WG_URL)));
  });

  it("SingBoxParser routes the WG public key to extensions only (even with a stray public_key)", () => {
    const [node] = normalizeManySingBox(parseSingBox(WG_SINGBOX));
    assertNoPbkLeak("singbox", node);
  });

  it("ClashParser routes the WG public key to extensions only", () => {
    const [node] = normalizeManyClash(parseClash(WG_CLASH));
    assertNoPbkLeak("clash", node);
  });

  it("does NOT affect genuine Reality nodes — pbk/sid still resolve normally (control)", () => {
    const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";
    const reality = normalizeUrl(parseUrl(
      `vless://${UUID}@ex.example.com:443?security=reality&sni=a.com&pbk=REALPBK&sid=ab12&type=tcp#r`,
    ));
    expect(reality.protocol).toBe("vless");
    expect(reality.pbk).toBe("REALPBK");
    expect(reality.sid).toBe("ab12");
  });
});
