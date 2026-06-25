/**
 * Raw-config Baseline Test Dataset — 15-TESTING_FRAMEWORK §5 (MANDATORY).
 *
 * 100 RAW config texts (not hand-built UNM nodes): 50 valid / 30 partially-broken
 * / 20 invalid, covering all 7 protocols (vless, vmess, trojan, shadowsocks,
 * hysteria2, tuic, wireguard) across all 6 input formats (url, subscription,
 * xray-json, singbox-json, clash-yaml, wireguard-conf).
 *
 * This is the Phase 2/3 layer of the Foundation Acceptance Gate per
 * ADR-006: each sample flows through the REAL pipeline
 * `Raw → ParserFactory → parse/recover → normalizeMany → applyValidation`.
 * Nothing here is tuned to "pass" — the samples are realistic configs and the
 * gate measures honestly.
 *
 * Category semantics (the gate enforces exactly these):
 *  - valid:             well-formed; must parse (no recovery) into ≥1 node, ALL
 *                       of which validate overallValid === true.
 *  - partially-broken:  structurally damaged but the data is intact; the parser
 *                       must yield ≥1 valid node (via tolerant parse or, more
 *                       usually, recover()). Recovery must NEVER fabricate secrets.
 *  - invalid:           must NOT yield any valid node — either Unknown Format /
 *                       unrecoverable, or every produced node validates false
 *                       (the Validation Engine's false-positive guard).
 */

/** @typedef {"url"|"subscription"|"xray"|"singbox"|"clash"|"wireguard"} Format */
/** @typedef {{ name: string, format: Format, protocol: string, raw: string }} Sample */

const U1 = "b831381d-6324-4d53-ad4f-8cda48b30811";
const U2 = "550e8400-e29b-41d4-a716-446655440000";

/** vmess:// = Base64(JSON). @param {Record<string, unknown>} o */
const vmessUrl = (o) => "vmess://" + btoa(JSON.stringify(o));
/** ss SIP002. */
const ssUrl = (/** @type {string} */ m, /** @type {string} */ p, /** @type {string} */ h, /** @type {number} */ port, /** @type {string} */ tag) =>
  "ss://" + btoa(`${m}:${p}`) + `@${h}:${port}#${tag}`;
/** ss legacy (whole userinfo+host base64). */
const ssLegacy = (/** @type {string} */ m, /** @type {string} */ p, /** @type {string} */ h, /** @type {number} */ port, /** @type {string} */ tag) =>
  "ss://" + btoa(`${m}:${p}@${h}:${port}`) + `#${tag}`;
const j = (/** @type {unknown} */ o) => JSON.stringify(o);

const VMESS_WS = { v: "2", ps: "vm", add: "vm.example.com", port: "443", id: U1, net: "ws", type: "none", host: "vm.example.com", path: "/v", tls: "tls", sni: "vm.example.com" };
const VMESS_TCP = { v: "2", ps: "vt", add: "203.0.113.5", port: "80", id: U2, net: "tcp", type: "none" };

// ===========================================================================
// VALID (50)
// ===========================================================================

/** @type {Sample[]} */
export const VALID = [
  // ---- URL (14) ----
  { name: "url-vless-reality", format: "url", protocol: "vless", raw:
    `vless://${U1}@ex.example.com:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=PUBKEY123&sid=ab12&type=grpc&serviceName=gsvc&flow=xtls-rprx-vision#reality` },
  { name: "url-vless-ws-tls", format: "url", protocol: "vless", raw:
    `vless://${U1}@cdn.example.com:443?security=tls&type=ws&sni=cdn.example.com&path=%2Fws&host=cdn.example.com&alpn=h2,http/1.1&fp=firefox#wstls` },
  { name: "url-vless-tcp-none", format: "url", protocol: "vless", raw:
    `vless://${U1}@9.9.9.9:12345?encryption=none&type=tcp#tcpnone` },
  { name: "url-vless-grpc", format: "url", protocol: "vless", raw:
    `vless://${U2}@grpc.example.com:2053?security=tls&type=grpc&sni=grpc.example.com&serviceName=GunService#grpc` },
  { name: "url-vmess-ws-tls", format: "url", protocol: "vmess", raw: vmessUrl(VMESS_WS) },
  { name: "url-vmess-tcp", format: "url", protocol: "vmess", raw: vmessUrl(VMESS_TCP) },
  { name: "url-trojan-tcp-tls", format: "url", protocol: "trojan", raw:
    `trojan://trojan-pass@tj.example.com:443?security=tls&sni=tj.example.com#trojan` },
  { name: "url-trojan-ws-tls", format: "url", protocol: "trojan", raw:
    `trojan://p%40ss@tj2.example.com:8443?security=tls&sni=tj2.example.com&type=ws&path=/tj&host=tj2.example.com#trojanws` },
  { name: "url-ss-sip002", format: "url", protocol: "shadowsocks", raw:
    ssUrl("aes-256-gcm", "ss-secret", "ss.example.com", 8388, "sssip002") },
  { name: "url-ss-legacy", format: "url", protocol: "shadowsocks", raw:
    ssLegacy("chacha20-ietf-poly1305", "legacy-pass", "ss2.example.com", 8389, "sslegacy") },
  { name: "url-hysteria2", format: "url", protocol: "hysteria2", raw:
    `hysteria2://hy-pass@hy.example.com:443?sni=hy.example.com#hy2` },
  { name: "url-hy2-alias", format: "url", protocol: "hysteria2", raw:
    `hy2://hy-pass@hy3.example.com:8443?sni=hy3.example.com#hy2alias` },
  { name: "url-tuic", format: "url", protocol: "tuic", raw:
    `tuic://${U1}:tuic-pass@tuic.example.com:443?sni=tuic.example.com&alpn=h3#tuic` },
  { name: "url-wireguard", format: "url", protocol: "wireguard", raw:
    `wireguard://privkeyAAA@wg.example.com:51820?publickey=pubkeyBBB&presharedkey=pskCCC&allowedips=0.0.0.0/0,%3A%3A/0&dns=1.1.1.1&mtu=1420&keepalive=25#wg` },

  // ---- Xray JSON (8) ----
  { name: "xray-vless-reality", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocol: "vless", tag: "r", settings: { vnext: [{ address: "ex.example.com", port: 443, users: [{ id: U1, flow: "xtls-rprx-vision" }] }] },
      streamSettings: { network: "grpc", security: "reality", realitySettings: { serverName: "www.microsoft.com", publicKey: "PBK123", shortId: "ab12", fingerprint: "chrome" }, grpcSettings: { serviceName: "gsvc" } } }] }) },
  { name: "xray-vless-ws-tls", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocol: "vless", tag: "w", settings: { vnext: [{ address: "1.2.3.4", port: 8443, users: [{ id: U1 }] }] },
      streamSettings: { network: "websocket", security: "tls", tlsSettings: { serverName: "cdn.example.com", alpn: ["h2", "http/1.1"] }, wsSettings: { path: "/ws", headers: { Host: "cdn.example.com" } } } }] }) },
  { name: "xray-vmess-tcp", format: "xray", protocol: "vmess", raw: j({ outbounds: [
    { protocol: "vmess", settings: { vnext: [{ address: "vmess.example.com", port: 443, users: [{ id: U2 }] }] }, streamSettings: { network: "tcp" } }] }) },
  { name: "xray-trojan-tcp", format: "xray", protocol: "trojan", raw: j({ outbounds: [
    { protocol: "trojan", settings: { servers: [{ address: "trojan.example.com", port: 443, password: "s3cr3t" }] }, streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: "trojan.example.com" } } }] }) },
  { name: "xray-shadowsocks", format: "xray", protocol: "shadowsocks", raw: j({ outbounds: [
    { protocol: "shadowsocks", settings: { servers: [{ address: "ss.example.com", port: 8388, method: "aes-256-gcm", password: "ss-pass" }] }, streamSettings: { network: "tcp" } }] }) },
  { name: "xray-vless-grpc-tls", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocol: "vless", settings: { vnext: [{ address: "g.example.com", port: 2053, users: [{ id: U2 }] }] }, streamSettings: { network: "grpc", security: "tls", tlsSettings: { serverName: "g.example.com" }, grpcSettings: { serviceName: "Svc" } } }] }) },
  { name: "xray-multi-outbound", format: "xray", protocol: "mixed", raw: j({ outbounds: [
    { protocol: "vless", tag: "a", settings: { vnext: [{ address: "a.example.com", port: 443, users: [{ id: U1 }] }] }, streamSettings: { network: "tcp", security: "none" } },
    { protocol: "trojan", tag: "b", settings: { servers: [{ address: "b.example.com", port: 443, password: "pw" }] }, streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: "b.example.com" } } }] }) },
  { name: "xray-vmess-multi-user", format: "xray", protocol: "vmess", raw: j({ outbounds: [
    { protocol: "vmess", settings: { vnext: [{ address: "mu.example.com", port: 443, users: [{ id: U1 }, { id: U2 }] }] }, streamSettings: { network: "tcp" } }] }) },

  // ---- Sing-box JSON (8) ----
  { name: "singbox-vless-reality", format: "singbox", protocol: "vless", raw: j({ outbounds: [
    { type: "vless", tag: "r", server: "ex.example.com", server_port: 443, uuid: U1, flow: "xtls-rprx-vision",
      tls: { enabled: true, server_name: "sni.example.com", utls: { enabled: true, fingerprint: "chrome" }, reality: { enabled: true, public_key: "PUB123", short_id: "ab12" } },
      transport: { type: "grpc", service_name: "gsvc" } }] }) },
  { name: "singbox-vmess-ws", format: "singbox", protocol: "vmess", raw: j({ outbounds: [
    { type: "vmess", tag: "vm", server: "vm.example.com", server_port: 443, uuid: U2,
      tls: { enabled: true, server_name: "vm.example.com" }, transport: { type: "ws", path: "/v", headers: { Host: "vm.example.com" } } }] }) },
  { name: "singbox-trojan-ws", format: "singbox", protocol: "trojan", raw: j({ outbounds: [
    { type: "trojan", tag: "tj", server: "tj.example.com", server_port: 443, password: "tjpass",
      tls: { enabled: true, server_name: "tj.example.com", alpn: ["h2", "http/1.1"] }, transport: { type: "ws", path: "/tw", headers: { Host: "tj.example.com" } } }] }) },
  { name: "singbox-shadowsocks", format: "singbox", protocol: "shadowsocks", raw: j({ outbounds: [
    { type: "shadowsocks", tag: "ss", server: "ss.example.com", server_port: 8388, method: "aes-256-gcm", password: "sspass" }] }) },
  { name: "singbox-hysteria2", format: "singbox", protocol: "hysteria2", raw: j({ outbounds: [
    { type: "hysteria2", tag: "hy", server: "hy.example.com", server_port: 443, password: "hypass",
      tls: { enabled: true, server_name: "hy.example.com", alpn: ["h3"] } }] }) },
  { name: "singbox-tuic", format: "singbox", protocol: "tuic", raw: j({ outbounds: [
    { type: "tuic", tag: "tu", server: "tuic.example.com", server_port: 443, uuid: U1, password: "tpass",
      tls: { enabled: true, server_name: "tuic.example.com", alpn: ["h3"] } }] }) },
  { name: "singbox-wireguard-endpoints", format: "singbox", protocol: "wireguard", raw: j({ endpoints: [
    { type: "wireguard", tag: "wg", server: "ep.example.com", server_port: 51820, private_key: "EPRIV", peer_public_key: "EPEER", mtu: 1280 }] }) },
  { name: "singbox-multi", format: "singbox", protocol: "mixed", raw: j({ outbounds: [
    { type: "selector", tag: "sel", outbounds: ["a"] },
    { type: "vless", tag: "v", server: "v.example.com", server_port: 443, uuid: U1, tls: { enabled: true, server_name: "v.example.com" } },
    { type: "shadowsocks", tag: "s", server: "s.example.com", server_port: 8388, method: "aes-256-gcm", password: "p" },
    { type: "wireguard", tag: "w", server: "w.example.com", server_port: 51820, private_key: "PK", peer_public_key: "PEER", mtu: 1420 },
    { type: "direct", tag: "d" }] }) },

  // ---- Clash YAML (8) ----
  { name: "clash-vless-reality", format: "clash", protocol: "vless", raw:
`proxies:
  - name: r
    type: vless
    server: ex.example.com
    port: 443
    uuid: ${U1}
    network: grpc
    flow: xtls-rprx-vision
    servername: sni.example.com
    client-fingerprint: chrome
    reality-opts:
      public-key: PUB123
      short-id: ab12
    grpc-opts:
      grpc-service-name: gsvc
` },
  { name: "clash-vmess-ws", format: "clash", protocol: "vmess", raw:
`proxies:
  - name: vm
    type: vmess
    server: vm.example.com
    port: 443
    uuid: ${U2}
    cipher: auto
    network: ws
    tls: true
    servername: vm.example.com
    ws-opts:
      path: /v
      headers:
        Host: vm.example.com
` },
  { name: "clash-trojan-ws", format: "clash", protocol: "trojan", raw:
`proxies:
  - name: tj
    type: trojan
    server: tj.example.com
    port: 443
    password: tjpass
    sni: tj.example.com
    network: ws
    ws-opts:
      path: /tw
      headers:
        Host: tj.example.com
    alpn: [h2, http/1.1]
` },
  { name: "clash-shadowsocks", format: "clash", protocol: "shadowsocks", raw:
`proxies:
  - name: ss
    type: ss
    server: ss.example.com
    port: 8388
    cipher: aes-256-gcm
    password: sspass
` },
  { name: "clash-hysteria2", format: "clash", protocol: "hysteria2", raw:
`proxies:
  - name: hy
    type: hysteria2
    server: hy.example.com
    port: 443
    password: hypass
    sni: hy.example.com
` },
  { name: "clash-tuic", format: "clash", protocol: "tuic", raw:
`proxies:
  - name: tu
    type: tuic
    server: tuic.example.com
    port: 443
    uuid: ${U1}
    password: tpass
    sni: tuic.example.com
` },
  { name: "clash-wireguard", format: "clash", protocol: "wireguard", raw:
`proxies:
  - name: wg
    type: wireguard
    server: wg.example.com
    port: 51820
    private-key: PRIVKEY
    public-key: PEERKEY
    pre-shared-key: PSK
    ip: 10.0.0.2/32
    mtu: 1420
` },
  { name: "clash-multi", format: "clash", protocol: "mixed", raw:
`proxies:
  - name: v
    type: vless
    server: v.example.com
    port: 443
    uuid: ${U1}
    tls: true
    servername: v.example.com
  - name: s
    type: ss
    server: s.example.com
    port: 8388
    cipher: aes-256-gcm
    password: p
  - name: tj
    type: trojan
    server: tj.example.com
    port: 443
    password: tjpass
    sni: tj.example.com
proxy-groups:
  - name: auto
    type: select
    proxies: [v, s]
` },

  // ---- Subscription (6) ----
  { name: "sub-plain-mixed", format: "subscription", protocol: "mixed", raw:
    [`vless://${U1}@a.example.com:443?security=tls&sni=a.example.com#A`,
     "trojan://tjpass@b.example.com:443?security=tls&sni=b.example.com#B",
     vmessUrl({ v: "2", ps: "C", add: "c.example.com", port: "443", id: U2, net: "ws", tls: "tls", sni: "c.example.com", path: "/c" }),
     ssUrl("aes-256-gcm", "sspass", "d.example.com", 8388, "D")].join("\n") },
  { name: "sub-base64-mixed", format: "subscription", protocol: "mixed", raw:
    btoa([`vless://${U1}@e.example.com:443?security=tls&sni=e.example.com#E`,
          "trojan://p@f.example.com:443?security=tls&sni=f.example.com#F"].join("\n")) },
  { name: "sub-plain-vless-vmess", format: "subscription", protocol: "mixed", raw:
    [`vless://${U2}@g.example.com:443?security=tls&sni=g.example.com#G`,
     vmessUrl({ v: "2", ps: "H", add: "h.example.com", port: "443", id: U1, net: "tcp" })].join("\n") },
  { name: "sub-base64-trojan-ss", format: "subscription", protocol: "mixed", raw:
    btoa(["trojan://pw@i.example.com:443?security=tls&sni=i.example.com#I",
          ssUrl("aes-256-gcm", "k", "k.example.com", 8388, "K")].join("\n")) },
  { name: "sub-plain-with-duplicate", format: "subscription", protocol: "mixed", raw:
    [`vless://${U1}@l.example.com:443?security=tls&sni=l.example.com#L`,
     "trojan://pw@m.example.com:443?security=tls&sni=m.example.com#M",
     `vless://${U1}@l.example.com:443?security=tls&sni=l.example.com#L`].join("\n") },
  { name: "sub-plain-many", format: "subscription", protocol: "mixed", raw:
    [`vless://${U1}@n1.example.com:443?security=tls&sni=n1.example.com#N1`,
     `vless://${U2}@n2.example.com:443?security=tls&sni=n2.example.com#N2`,
     "trojan://pw@n3.example.com:443?security=tls&sni=n3.example.com#N3",
     ssUrl("aes-256-gcm", "p", "n4.example.com", 8388, "N4"),
     vmessUrl({ v: "2", ps: "N5", add: "n5.example.com", port: "443", id: U1, net: "tcp" })].join("\n") },

  // ---- WireGuard .conf (6) ----
  { name: "wg-single-peer", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = SOLOPRIV=

[Peer]
PublicKey = SOLOPUB=
Endpoint = solo.example.com:51820
AllowedIPs = 0.0.0.0/0
` },
  { name: "wg-multi-peer", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = PRIV=
DNS = 1.1.1.1, 8.8.8.8
MTU = 1420

[Peer]
PublicKey = PEER1=
PresharedKey = PSK1=
Endpoint = wg1.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Peer]
PublicKey = PEER2=
Endpoint = wg2.example.com:51821
AllowedIPs = 10.0.0.0/24
` },
  { name: "wg-ipv6-endpoint", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = P6=

[Peer]
PublicKey = PUB6=
Endpoint = [2001:db8::1]:51820
AllowedIPs = ::/0
` },
  { name: "wg-dns-mtu", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = PDM=
DNS = 9.9.9.9
MTU = 1380

[Peer]
PublicKey = PUBDM=
Endpoint = dm.example.com:51820
AllowedIPs = 0.0.0.0/0
` },
  { name: "wg-minimal", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = PMIN=

[Peer]
PublicKey = PUBMIN=
Endpoint = min.example.com:51820
` },
  { name: "wg-keepalive", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = PKA=

[Peer]
PublicKey = PUBKA=
Endpoint = ka.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 15
` },
];

// ===========================================================================
// PARTIALLY BROKEN (30) — recoverable, must yield ≥1 VALID node
//
// IMPORTANT (honest scoping): every sample here is one the ParserFactory can
// DETECT (confidence ≥ threshold) so the pipeline routes it to parse()/recover().
// Two real recover() features are intentionally NOT exercised here because they
// are unreachable through the factory by design — a misspelled URL scheme
// (vmes://) and a corrupted-alphabet Base64 subscription both fail DETECTION, so
// no parser is ever selected to recover them. Those paths are covered by the
// per-parser unit tests that call recover() directly. The factory-reachable
// recovery surface (corrupt vmess payload, broken JSON, tab YAML, misspelled WG
// section, junk subscription lines) is what a real pipeline can actually salvage.
// ===========================================================================

/** @type {Sample[]} */
export const PARTIALLY_BROKEN = [
  // ---- URL (3): valid vmess:// scheme (detected), corrupted Base64 body -> recover sanitizes ----
  { name: "url-vmess-dirty-base64-1", format: "url", protocol: "vmess", raw:
    ("vmess://" + btoa(JSON.stringify(VMESS_WS))).replace(/(.{12})/, "$1!!") },
  { name: "url-vmess-dirty-base64-2", format: "url", protocol: "vmess", raw:
    ("vmess://" + btoa(JSON.stringify(VMESS_TCP))).replace(/(.{16})/, "$1@@") },
  { name: "url-vmess-dirty-base64-3", format: "url", protocol: "vmess", raw:
    ("vmess://" + btoa(JSON.stringify({ ...VMESS_WS, ps: "dirty3", add: "rec4.example.com" }))).replace(/(.{20})/, "$1##") },

  // ---- Xray JSON (6): trailing commas, comments, misspelled key ----
  { name: "xray-trailing-comma-comment", format: "xray", protocol: "vless", raw:
`{
  // exported by tool
  "outbounds": [
    { "protocol": "vless", "settings": { "vnext": [ { "address": "rec.example.com", "port": 443, "users": [ { "id": "${U1}" }, ] } ] }, "streamSettings": { "network": "tcp", "security": "none" }, },
  ],
}` },
  { name: "xray-misspelled-protocol-key", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocl: "vless", settings: { vnext: [{ address: "typo.example.com", port: 443, users: [{ id: U1 }] }] }, streamSettings: { network: "tcp" } }] }) },
  { name: "xray-trojan-trailing-comma", format: "xray", protocol: "trojan", raw:
`{ "outbounds": [ { "protocol": "trojan", "settings": { "servers": [ { "address": "rct.example.com", "port": 443, "password": "p", }, ], }, "streamSettings": { "network": "tcp", "security": "tls", "tlsSettings": { "serverName": "rct.example.com" } }, }, ], }` },
  { name: "xray-block-comment", format: "xray", protocol: "vmess", raw:
`{
  /* config */
  "outbounds": [
    { "protocol": "vmess", "settings": { "vnext": [ { "address": "rcv.example.com", "port": 443, "users": [ { "id": "${U2}" } ] } ] }, "streamSettings": { "network": "tcp" } }
  ]
}` },
  { name: "xray-ss-trailing-comma", format: "xray", protocol: "shadowsocks", raw:
`{ "outbounds": [ { "protocol": "shadowsocks", "settings": { "servers": [ { "address": "rcs.example.com", "port": 8388, "method": "aes-256-gcm", "password": "p", }, ], }, }, ], }` },
  { name: "xray-multi-trailing-comma", format: "xray", protocol: "mixed", raw:
`{ "outbounds": [
    { "protocol": "vless", "settings": { "vnext": [ { "address": "mxa.example.com", "port": 443, "users": [ { "id": "${U1}" } ] } ] }, "streamSettings": { "network": "tcp", "security": "none" }, },
    { "protocol": "trojan", "settings": { "servers": [ { "address": "mxb.example.com", "port": 443, "password": "p" } ] }, "streamSettings": { "network": "tcp", "security": "tls", "tlsSettings": { "serverName": "mxb.example.com" } }, },
  ], }` },

  // ---- Sing-box JSON (6) ----
  { name: "singbox-trailing-comma-comment", format: "singbox", protocol: "trojan", raw:
`{
  // exported
  "outbounds": [
    { "type": "trojan", "tag": "t", "server": "rec.example.com", "server_port": 443, "password": "p", "tls": { "enabled": true, "server_name": "rec.example.com" }, },
  ],
}` },
  { name: "singbox-block-comment", format: "singbox", protocol: "vless", raw:
`{
  /* sing-box */
  "outbounds": [
    { "type": "vless", "tag": "v", "server": "rcv.example.com", "server_port": 443, "uuid": "${U1}", "tls": { "enabled": true, "server_name": "rcv.example.com" } }
  ]
}` },
  { name: "singbox-vmess-trailing-comma", format: "singbox", protocol: "vmess", raw:
`{ "outbounds": [ { "type": "vmess", "tag": "vm", "server": "rcvm.example.com", "server_port": 443, "uuid": "${U2}", }, ], }` },
  { name: "singbox-ss-line-comment", format: "singbox", protocol: "shadowsocks", raw:
`{
  "outbounds": [
    // shadowsocks node
    { "type": "shadowsocks", "tag": "s", "server": "rcss.example.com", "server_port": 8388, "method": "aes-256-gcm", "password": "p" }
  ]
}` },
  { name: "singbox-hysteria2-trailing-comma", format: "singbox", protocol: "hysteria2", raw:
`{ "outbounds": [ { "type": "hysteria2", "tag": "hy", "server": "rch.example.com", "server_port": 443, "password": "p", "tls": { "enabled": true, "server_name": "rch.example.com" }, }, ], }` },
  { name: "singbox-multi-trailing-comma", format: "singbox", protocol: "mixed", raw:
`{ "outbounds": [
    { "type": "vless", "tag": "a", "server": "ma.example.com", "server_port": 443, "uuid": "${U1}", "tls": { "enabled": true, "server_name": "ma.example.com" }, },
    { "type": "trojan", "tag": "b", "server": "mb.example.com", "server_port": 443, "password": "p", "tls": { "enabled": true, "server_name": "mb.example.com" }, },
  ], }` },

  // ---- Clash YAML (6): TAB indentation (YAML forbids tabs) ----
  { name: "clash-trojan-tabs", format: "clash", protocol: "trojan", raw:
    "proxies:\n\t- name: t\n\t  type: trojan\n\t  server: rct.example.com\n\t  port: 443\n\t  password: p\n\t  sni: rct.example.com\n" },
  { name: "clash-vless-tabs", format: "clash", protocol: "vless", raw:
    `proxies:\n\t- name: v\n\t  type: vless\n\t  server: rcv.example.com\n\t  port: 443\n\t  uuid: ${U1}\n\t  tls: true\n\t  servername: rcv.example.com\n` },
  { name: "clash-vmess-tabs", format: "clash", protocol: "vmess", raw:
    `proxies:\n\t- name: vm\n\t  type: vmess\n\t  server: rcvm.example.com\n\t  port: 443\n\t  uuid: ${U2}\n\t  cipher: auto\n` },
  { name: "clash-ss-tabs", format: "clash", protocol: "shadowsocks", raw:
    "proxies:\n\t- name: s\n\t  type: ss\n\t  server: rcss.example.com\n\t  port: 8388\n\t  cipher: aes-256-gcm\n\t  password: p\n" },
  { name: "clash-tuic-tabs", format: "clash", protocol: "tuic", raw:
    `proxies:\n\t- name: tu\n\t  type: tuic\n\t  server: rctu.example.com\n\t  port: 443\n\t  uuid: ${U1}\n\t  password: p\n\t  sni: rctu.example.com\n` },
  { name: "clash-multi-tabs", format: "clash", protocol: "mixed", raw:
    `proxies:\n\t- name: a\n\t  type: vless\n\t  server: mta.example.com\n\t  port: 443\n\t  uuid: ${U1}\n\t  tls: true\n\t  servername: mta.example.com\n\t- name: b\n\t  type: trojan\n\t  server: mtb.example.com\n\t  port: 443\n\t  password: p\n\t  sni: mtb.example.com\n` },

  // ---- WireGuard .conf (4): misspelled [Peer] section -> detect anchors on [Interface], recover fuzzes ----
  { name: "wg-misspelled-peers", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = P=

[Peers]
PublicKey = PUB=
Endpoint = rec.example.com:51820
AllowedIPs = 0.0.0.0/0
` },
  { name: "wg-misspelled-pee", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = P=

[Pee]
PublicKey = PUB=
Endpoint = rec2.example.com:51820
AllowedIPs = 0.0.0.0/0
` },
  { name: "wg-misspelled-peerr", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = P=

[Peerr]
PublicKey = PUB=
Endpoint = rec3.example.com:51820
AllowedIPs = 0.0.0.0/0
` },
  { name: "wg-misspelled-two-peers", format: "wireguard", protocol: "wireguard", raw:
`[Interface]
PrivateKey = P=

[Peers]
PublicKey = PUB1=
Endpoint = mp1.example.com:51820
AllowedIPs = 0.0.0.0/0

[Peerss]
PublicKey = PUB2=
Endpoint = mp2.example.com:51821
AllowedIPs = 10.0.0.0/24
` },

  // ---- Subscription (5): junk/comment/duplicate lines tolerated; broken lines skipped (never fabricated) ----
  { name: "sub-with-junk-lines", format: "subscription", protocol: "mixed", raw:
    ["# my subscription",
     `vless://${U1}@s3.example.com:443?security=tls&sni=s3.example.com#S3`,
     "this is not a url",
     "trojan://p@s4.example.com:443?security=tls&sni=s4.example.com#S4"].join("\n") },
  { name: "sub-junk-and-broken-line", format: "subscription", protocol: "mixed", raw:
    [`vless://${U1}@s7.example.com:443?security=tls&sni=s7.example.com#S7`,
     "vmess://!!!broken!!!",
     "trojan://p@s8.example.com:443?security=tls&sni=s8.example.com#S8"].join("\n") },
  { name: "sub-duplicate-and-junk", format: "subscription", protocol: "mixed", raw:
    ["# header",
     `vless://${U1}@s9.example.com:443?security=tls&sni=s9.example.com#S9`,
     `vless://${U1}@s9.example.com:443?security=tls&sni=s9.example.com#S9`,
     "not-a-config",
     "trojan://p@s10.example.com:443?security=tls&sni=s10.example.com#S10"].join("\n") },
  { name: "sub-leading-trailing-blank-lines", format: "subscription", protocol: "mixed", raw:
    ["", "   ",
     `vless://${U2}@s11.example.com:443?security=tls&sni=s11.example.com#S11`,
     "trojan://p@s12.example.com:443?security=tls&sni=s12.example.com#S12",
     "", ""].join("\n") },
  { name: "sub-mixed-with-broken-and-dup", format: "subscription", protocol: "mixed", raw:
    [`vless://${U1}@s13.example.com:443?security=tls&sni=s13.example.com#S13`,
     "// a comment line",
     ssUrl("aes-256-gcm", "p", "s14.example.com", 8388, "S14"),
     "vmess://@@@notbase64@@@",
     `vless://${U1}@s13.example.com:443?security=tls&sni=s13.example.com#S13`].join("\n") },
];


// ===========================================================================
// INVALID (20) — must NOT yield any valid node
// ===========================================================================

/** @type {Sample[]} */
export const INVALID = [
  // ---- Unknown Format / unparseable (10) ----
  { name: "inv-random-text", format: "url", protocol: "none", raw: "hello world, this is not a config at all" },
  { name: "inv-plain-number", format: "url", protocol: "none", raw: "1234567890" },
  { name: "inv-html", format: "url", protocol: "none", raw: "<html><body>not a config</body></html>" },
  { name: "inv-json-no-proxy", format: "xray", protocol: "none", raw: j({ foo: "bar", baz: [1, 2, 3] }) },
  { name: "inv-yaml-no-proxies", format: "clash", protocol: "none", raw: "rules:\n  - MATCH,DIRECT\nport: 7890\n" },
  { name: "inv-broken-base64-sub", format: "subscription", protocol: "none", raw: "bm90LWEtc3Vic2NyaXB0aW9uLXBheWxvYWQtYXQtYWxs" },
  { name: "inv-unsupported-scheme", format: "url", protocol: "none", raw: "ftp://example.com/file" },
  { name: "inv-xray-only-freedom", format: "xray", protocol: "none", raw: j({ outbounds: [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }] }) },
  { name: "inv-singbox-no-proxy", format: "singbox", protocol: "none", raw: j({ outbounds: [{ type: "direct", tag: "d" }, { type: "dns", tag: "dns" }] }) },
  { name: "inv-sub-all-junk", format: "subscription", protocol: "none", raw: "# just comments\nnot a url\nalso not a url\n" },

  // ---- Parses but semantically invalid → node validates false (false-positive guard) (10) ----
  { name: "inv-url-vless-bad-uuid", format: "url", protocol: "vless", raw:
    "vless://not-a-real-uuid@bad1.example.com:443?security=tls&sni=bad1.example.com#x" },
  { name: "inv-url-vless-reality-no-pbk", format: "url", protocol: "vless", raw:
    `vless://${U1}@bad2.example.com:443?security=reality&sni=bad2.example.com#x` },
  { name: "inv-url-vless-bad-path", format: "url", protocol: "vless", raw:
    `vless://${U1}@bad3.example.com:443?security=tls&sni=bad3.example.com&type=ws&path=no-leading-slash&host=bad3.example.com#x` },
  { name: "inv-url-vmess-missing-uuid", format: "url", protocol: "vmess", raw:
    vmessUrl({ v: "2", ps: "x", add: "bad4.example.com", port: "443", net: "tcp" }) },
  { name: "inv-xray-bad-uuid", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocol: "vless", settings: { vnext: [{ address: "bad5.example.com", port: 443, users: [{ id: "xxxx-not-uuid" }] }] }, streamSettings: { network: "tcp" } }] }) },
  { name: "inv-xray-port-out-of-range", format: "xray", protocol: "vless", raw: j({ outbounds: [
    { protocol: "vless", settings: { vnext: [{ address: "bad6.example.com", port: 70000, users: [{ id: U1 }] }] }, streamSettings: { network: "tcp" } }] }) },
  { name: "inv-singbox-bad-uuid", format: "singbox", protocol: "vless", raw: j({ outbounds: [
    { type: "vless", tag: "b", server: "bad7.example.com", server_port: 443, uuid: "not-uuid" }] }) },
  { name: "inv-clash-bad-uuid", format: "clash", protocol: "vless", raw:
`proxies:
  - name: b
    type: vless
    server: bad8.example.com
    port: 443
    uuid: definitely-not-a-uuid
` },
  { name: "inv-vmess-bad-uuid-json", format: "url", protocol: "vmess", raw:
    vmessUrl({ v: "2", ps: "x", add: "bad9.example.com", port: "443", id: "bad-uuid-value", net: "tcp" }) },
  { name: "inv-clash-reality-no-pbk", format: "clash", protocol: "vless", raw:
`proxies:
  - name: b
    type: vless
    server: bad10.example.com
    port: 443
    uuid: ${U1}
    network: tcp
    reality-opts:
      short-id: ab12
` },
];

/** All 100 raw samples, in category order. */
export const ALL_SAMPLES = [...VALID, ...PARTIALLY_BROKEN, ...INVALID];
