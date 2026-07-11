/**
 * Compatibility Analyzer — 06-ANALYZER_ENGINE §2.6, the first نیمه‌قطعی
 * (Extended) module (09-DEVELOPMENT_ROADMAP Phase 10), picked first for being
 * the lowest-risk one in §2: a static lookup table, never multi-layer
 * Base64/payload decoding like the Cloudflare/Worker/Clean-IP modules
 * (§2.1-§2.3).
 *
 * Question (§2.6): would a real client, on a real platform, actually be able
 * to USE this node? §2.6's own correction note splits this into two
 * deliberately separate sub-questions, never conflated:
 *  - Client Compatibility: does this specific client app's core implement
 *    the node's protocol + transport + security combination at all?
 *  - Platform Compatibility: does ANY client exist on this OS that is
 *    Client-Compatible with this node? Platform is therefore derived FROM
 *    Client through a static, node-INDEPENDENT platform->client availability
 *    table (which apps run on which OS — a fact about the apps, not about
 *    this node) — never re-derived from protocol/network/security directly.
 *
 * Boundaries respected (mirrors the other analyzers' own boundary notes):
 *  - NOT validity (Validation Engine, spec 04, never re-checked here).
 *  - NOT a quality score (Security Analyzer, §1.2/`security-analyzer.js`).
 *  - NOT Reality Compatibility (Reality Analyzer, §1.5/`reality-analyzer.js`)
 *    — that judges whether THIS node's own pbk/sid/fingerprint are
 *    structurally usable at all, independent of any client. This module
 *    instead asks which of the six named clients implement the Reality
 *    *protocol layer* in the first place, and consumes nothing from it (no
 *    shared state — a deliberately orthogonal question).
 *
 * Rule 9 (never fabricate): every `true`/`false` cell below is backed by a
 * documented, citable fact about that client/platform (cited inline next to
 * each table). Every cell that would require information this module cannot
 * have — most commonly the installed client's VERSION, which no `UNMNode`
 * field carries — is `null` ("نامشخص"), never a guessed verdict. The
 * canonical example is Reality on v2rayNG: Xray-core itself originated
 * Reality, and v2rayNG is an Xray-core wrapper, but only versions released
 * after Xray-core's own Reality support landed actually expose it — with no
 * version field on the node, this module cannot tell which side of that line
 * a given config falls on, so it reports `null`, not a confident guess.
 *
 * Three-valued (Kleene) logic combines sub-verdicts: AND short-circuits to
 * `false` the moment any input is `false` (an incompatibility is conclusive
 * regardless of what else is unknown); otherwise it is `null` if any input is
 * `null`, else `true`. OR is the mirror image. This is how a per-client
 * verdict is built from (protocol support AND network support AND security
 * support), and how a per-platform verdict is built from "OR over its
 * available clients' own verdicts".
 *
 * Pure & Sync, mirroring the other analyzers; not yet wrapped by
 * `analyzer.worker.js` independently — `analyzeNode` calls it alongside the
 * six §1 Core modules and `analyzeBatch` carries it through unchanged
 * (ADR-003).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").Protocol} Protocol
 * @typedef {import("../../types/unm").NetworkType} NetworkType
 * @typedef {import("../types").Platform} Platform
 * @typedef {import("../types").ClientApp} ClientApp
 * @typedef {import("../types").CompatibilityAnalysis} CompatibilityAnalysis
 */

/** @type {readonly ClientApp[]} */
const CLIENTS = Object.freeze(["xray", "sing-box", "clash-meta", "nekobox", "v2rayng", "hiddify"]);

/** @type {readonly Platform[]} */
const PLATFORMS = Object.freeze(["android", "ios", "windows", "linux", "macos"]);

/**
 * Three-valued AND: `false` dominates, then `null`, else `true`.
 * @param {...(boolean | null)} values
 * @returns {boolean | null}
 */
function and3(...values) {
  if (values.some((v) => v === false)) return false;
  if (values.some((v) => v === null)) return null;
  return true;
}

/**
 * Three-valued OR: `true` dominates, then `null`, else `false`.
 * @param {(boolean | null)[]} values
 * @returns {boolean | null}
 */
function or3(values) {
  if (values.some((v) => v === true)) return true;
  if (values.some((v) => v === null)) return null;
  return false;
}

/**
 * Which client cores implement which protocols (documented project facts,
 * not per-node guesses). `null` = version-dependent rollout, not knowable
 * from a UNMNode alone.
 *  - Xray-core never implemented Hysteria2/TUIC (separate, unrelated
 *    projects by different authors); it DOES ship a "wireguard" outbound
 *    (used for e.g. WARP-over-Xray configs).
 *  - sing-box/Clash.Meta(mihomo)/Hiddify(sing-box-based)/NekoBox (wraps both
 *    Xray-core and sing-box-core) all explicitly added Hysteria2/TUIC/
 *    WireGuard outbound support.
 *  - v2rayNG is an Xray-core wrapper with a native WireGuard config type, but
 *    its Hysteria2/TUIC support was added in later releases bundling
 *    sing-box alongside Xray-core — without a version field, which side of
 *    that rollout a given node's intended client falls on is not knowable.
 * @type {Readonly<Record<Protocol, Readonly<Record<ClientApp, boolean | null>>>>}
 */
const PROTOCOL_CLIENT_SUPPORT = Object.freeze({
  vless: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
  vmess: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
  trojan: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
  shadowsocks: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
  hysteria2: Object.freeze({ xray: false, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: null, hiddify: true }),
  tuic: Object.freeze({ xray: false, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: null, hiddify: true }),
  wireguard: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
});

/**
 * Transports universally implemented across every client's underlying core
 * (tcp/ws/grpc all predate the cores' divergence; http-upgrade was adopted by
 * all of them within a similar timeframe) — true regardless of client.
 * @type {readonly NetworkType[]}
 */
const UNIVERSAL_NETWORKS = Object.freeze(["tcp", "ws", "grpc", "http-upgrade"]);

/**
 * The remaining, inconsistently-supported transports, per client:
 *  - kcp (mKCP): a long-standing V2Ray/Xray-only feature; sing-box's authors
 *    deliberately never implemented it (documented, not an oversight) — so
 *    Clash.Meta/Hiddify (sing-box-based) inherit that absence. NekoBox can
 *    switch between an Xray-core and a sing-box-core backend, and which one
 *    is active is not knowable from the node, so it is `null`.
 *  - quic (as a raw streamSettings transport, not the protocol-level QUIC
 *    underlying Hysteria2/TUIC): support has shifted across Xray-core
 *    releases and is inconsistent enough across all six clients that no cell
 *    here is asserted with confidence — every client is `null`.
 *  - xhttp (formerly splithttp): an Xray-core-originated transport; v2rayNG
 *    (an Xray-core wrapper) added a matching UI option. Whether/when the
 *    other, sing-box-based clients picked it up is not something this module
 *    can cite with confidence, so they are `null`.
 * @type {Readonly<Partial<Record<NetworkType, Readonly<Record<ClientApp, boolean | null>>>>>}
 */
const EXOTIC_NETWORK_CLIENT_SUPPORT = Object.freeze({
  kcp: Object.freeze({ xray: true, "sing-box": false, "clash-meta": false, nekobox: null, v2rayng: true, hiddify: false }),
  quic: Object.freeze({ xray: null, "sing-box": null, "clash-meta": null, nekobox: null, v2rayng: null, hiddify: null }),
  xhttp: Object.freeze({ xray: true, "sing-box": null, "clash-meta": null, nekobox: null, v2rayng: true, hiddify: null }),
});

/**
 * Which clients implement the Reality protocol layer at all — orthogonal to
 * Reality Analyzer's (§1.5) judgment of whether THIS node's own pbk/sid are
 * structurally usable. Xray-core originated Reality; sing-box/Clash.Meta
 * (mihomo)/Hiddify (sing-box-based) and NekoBox (wraps both cores) all added
 * Reality support. v2rayNG's Reality support, like Hysteria2/TUIC above, is a
 * later-release addition with no node-visible version signal — the task's
 * own example of an undecidable cell.
 * @type {Readonly<Record<ClientApp, boolean | null>>}
 */
const REALITY_CLIENT_SUPPORT = Object.freeze({
  xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: null, hiddify: true,
});

/**
 * Static "does an app for client X exist on platform Y" facts (a fact about
 * the apps, never about any particular node) — documented per app:
 *  - NekoBox ("NekoBoxForAndroid") and v2rayNG are explicitly Android-only by
 *    their own project naming/README; neither ships outside Android.
 *  - sing-box and Hiddify(-Next) both explicitly publish official builds for
 *    all five platforms (sing-box: SFA/SFI/SFM + CLI; Hiddify-Next: an
 *    explicitly cross-platform Flutter app).
 *  - Xray-core publishes official Windows/Linux/macOS/Android release
 *    binaries; it has no official iOS build (no practical unsigned-binary
 *    distribution path), which this module reports as unknown rather than a
 *    confident "no" since Xray-core's own iOS-targeted builds are not
 *    something this module can rule out with confidence.
 *  - Clash.Meta (mihomo) publishes official Windows/Linux/macOS binaries and
 *    has well-known community Android GUIs; an iOS build under the
 *    mihomo/Clash.Meta name specifically is not something this module can
 *    confirm, hence unknown.
 * @type {Readonly<Record<Platform, Readonly<Record<ClientApp, boolean | null>>>>}
 */
const PLATFORM_CLIENT_AVAILABILITY = Object.freeze({
  android: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true }),
  ios: Object.freeze({ xray: null, "sing-box": true, "clash-meta": null, nekobox: false, v2rayng: false, hiddify: true }),
  windows: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: false, v2rayng: false, hiddify: true }),
  linux: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: false, v2rayng: false, hiddify: true }),
  macos: Object.freeze({ xray: true, "sing-box": true, "clash-meta": true, nekobox: false, v2rayng: false, hiddify: true }),
});

/**
 * Does `client` implement `network` at all? Universal transports are true
 * for everyone; the rest fall back to the exotic table, `null` for any
 * network this module has no table for (never assumed compatible).
 * @param {ClientApp} client
 * @param {NetworkType} network
 * @returns {boolean | null}
 */
function clientSupportsNetwork(client, network) {
  if (UNIVERSAL_NETWORKS.includes(network)) return true;
  const row = EXOTIC_NETWORK_CLIENT_SUPPORT[network];
  return row ? row[client] : null;
}

/**
 * Can `client` use this node at all: its protocol, its transport, and (when
 * relevant) the Reality protocol layer?
 * @param {UNMNode} node
 * @param {ClientApp} client
 * @returns {boolean | null}
 */
function clientCompatibility(node, client) {
  const protocolRow = PROTOCOL_CLIENT_SUPPORT[node.protocol];
  const protocolSupport = protocolRow ? protocolRow[client] : null;
  const networkSupport = clientSupportsNetwork(client, node.network);
  const securitySupport = node.security === "reality" ? REALITY_CLIENT_SUPPORT[client] : true;
  return and3(protocolSupport, networkSupport, securitySupport);
}

/**
 * Is this node usable on `platform`: does any client available there also
 * pass `clientCompatibility`?
 * @param {UNMNode} node
 * @param {Platform} platform
 * @returns {boolean | null}
 */
function platformCompatibility(node, platform) {
  const availability = PLATFORM_CLIENT_AVAILABILITY[platform];
  const contributions = CLIENTS.map((client) => and3(availability[client], clientCompatibility(node, client)));
  return or3(contributions);
}

/**
 * Run the Compatibility Analyzer on one node.
 * @param {UNMNode} node
 * @returns {CompatibilityAnalysis}
 */
export function analyzeCompatibility(node) {
  /** @type {Record<string, boolean | null>} */
  const clients = {};
  for (const client of CLIENTS) clients[client] = clientCompatibility(node, client);

  /** @type {Record<string, boolean | null>} */
  const platforms = {};
  for (const platform of PLATFORMS) platforms[platform] = platformCompatibility(node, platform);

  return {
    platforms: /** @type {CompatibilityAnalysis["platforms"]} */ (platforms),
    clients: /** @type {CompatibilityAnalysis["clients"]} */ (clients),
  };
}
