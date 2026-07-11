/**
 * Realistic Xray JSON fixtures for the XrayParser unit tests. Each is a string
 * (the parser consumes raw text), mirroring real exported Xray configs.
 */

/** VLESS + Reality + gRPC (publicKey/shortId/serverName -> pbk/sid/sni). */
export const VLESS_REALITY = JSON.stringify({
  outbounds: [
    {
      protocol: "vless",
      tag: "proxy-reality",
      settings: {
        vnext: [
          {
            address: "example.com",
            port: 443,
            users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811", encryption: "none", flow: "xtls-rprx-vision" }],
          },
        ],
      },
      streamSettings: {
        network: "grpc",
        security: "reality",
        realitySettings: {
          serverName: "www.microsoft.com",
          publicKey: "xL3mPq9vReALitYpUbKeY00000000000000000000000",
          shortId: "ab12",
          fingerprint: "chrome",
        },
        grpcSettings: { serviceName: "grpc-svc" },
      },
    },
  ],
});

/** VLESS + WS + TLS (websocket spelling, Host header, alpn). */
export const VLESS_WS_TLS = JSON.stringify({
  outbounds: [
    {
      protocol: "vless",
      tag: "proxy-ws",
      settings: {
        vnext: [
          { address: "1.2.3.4", port: 8443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811" }] },
        ],
      },
      streamSettings: {
        network: "websocket",
        security: "tls",
        tlsSettings: { serverName: "cdn.example.com", alpn: ["h2", "http/1.1"], fingerprint: "firefox" },
        wsSettings: { path: "/ws", headers: { Host: "cdn.example.com" } },
      },
    },
  ],
});

/** Trojan via settings.servers[] (password lives on the server). */
export const TROJAN_TCP = JSON.stringify({
  outbounds: [
    {
      protocol: "trojan",
      tag: "trojan-node",
      settings: { servers: [{ address: "trojan.example.com", port: 443, password: "s3cr3t-pass" }] },
      streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: "trojan.example.com" } },
    },
  ],
});

/** Shadowsocks via settings.servers[] (method + password). */
export const SHADOWSOCKS = JSON.stringify({
  outbounds: [
    {
      protocol: "shadowsocks",
      settings: { servers: [{ address: "ss.example.com", port: 8388, method: "aes-256-gcm", password: "ss-pass" }] },
      streamSettings: { network: "tcp" },
    },
  ],
});

/** Config with a freedom outbound BEFORE the real proxy — selectOutbound must skip it. */
export const WITH_FREEDOM_FIRST = JSON.stringify({
  outbounds: [
    { protocol: "freedom", tag: "direct" },
    {
      protocol: "vmess",
      settings: { vnext: [{ address: "vmess.example.com", port: 443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811" }] }] },
      streamSettings: { network: "tcp" },
    },
  ],
});

/** Broken JSON: trailing comma + line comment, but recoverable Xray shape. */
export const BROKEN_TRAILING_COMMA = `{
  // exported by some tool
  "outbounds": [
    {
      "protocol": "vless",
      "settings": { "vnext": [ { "address": "recover.example.com", "port": 443, "users": [ { "id": "b831381d-6324-4d53-ad4f-8cda48b30811" }, ] } ] },
      "streamSettings": { "network": "tcp", "security": "none" },
    },
  ],
}`;

/** Misspelled key: "protocl" instead of "protocol" — fuzzy recovery target. */
export const MISSPELLED_PROTOCOL = JSON.stringify({
  outbounds: [
    {
      protocl: "vless",
      settings: { vnext: [{ address: "typo.example.com", port: 443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811" }] }] },
      streamSettings: { network: "tcp" },
    },
  ],
});

/**
 * v2rayN-style export: a root-level Array of COMPLETE Xray config documents
 * (each with its own `log`/`outbounds`), rather than one document with a
 * multi-entry `outbounds` array. The 3rd element is deliberately a
 * freedom-only document (no real proxy outbound) — it must be Skipped, not
 * fabricated (ANTI_CHAOS Rule 9).
 */
export const V2RAYN_ARRAY_EXPORT = JSON.stringify([
  {
    log: { loglevel: "warning" },
    outbounds: [
      {
        protocol: "vless",
        tag: "proxy",
        settings: {
          vnext: [{ address: "doc1.example.com", port: 443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811", encryption: "none" }] }],
        },
        streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: "doc1.example.com" } },
      },
    ],
  },
  {
    log: { loglevel: "warning" },
    outbounds: [
      {
        protocol: "trojan",
        tag: "proxy2",
        settings: { servers: [{ address: "doc2.example.com", port: 443, password: "doc2-pass" }] },
        streamSettings: { network: "tcp" },
      },
    ],
  },
  {
    log: { loglevel: "warning" },
    outbounds: [{ protocol: "freedom", tag: "direct" }],
  },
]);

/** Two synonym public keys present — priority chain must pick publicKey. */
export const REALITY_DOUBLE_PBK = JSON.stringify({
  outbounds: [
    {
      protocol: "vless",
      settings: { vnext: [{ address: "dual.example.com", port: 443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811" }] }] },
      streamSettings: {
        network: "tcp",
        security: "reality",
        realitySettings: { serverName: "a.com", publicKey: "WINNER_PUBKEY", serverPublicKey: "LOSER_PUBKEY", shortId: "cd34" },
      },
    },
  ],
});
