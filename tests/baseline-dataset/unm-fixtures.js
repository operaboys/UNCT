/**
 * Canonical UNM fixtures for the Phase 1 Foundation Acceptance Gate.
 *
 * GOLDEN (immutable — 15-TESTING_FRAMEWORK §5): the `valid` set below is the
 * UNM-level reference covering all 7 protocols and the main transport/security
 * combinations. Per the Golden Dataset rule these entries must not be modified or
 * removed once they pass — only appended to.
 *
 * Each entry is a `createNode` input (the parser-supplied portion of a node).
 */

/** @typedef {Record<string, unknown>} NodeInput */

const UUID_A = "b831381d-6324-4d53-ad4f-8cda48b30811";
const UUID_B = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Well-formed nodes. Every one must validate to overallValid === true.
 * @type {{ name: string, input: NodeInput }[]}
 */
export const VALID_FIXTURES = [
  { name: "vless-tcp-reality", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    uuid: UUID_A, network: "tcp", security: "reality", sni: "www.microsoft.com",
    pbk: "xUre2Y0p_publickey", sid: "ab12", flow: "xtls-rprx-vision",
  } },
  { name: "vless-ws-tls", input: {
    sourceType: "vless-url", protocol: "vless", address: "cdn.example.com", port: 443,
    uuid: UUID_A, network: "ws", security: "tls", sni: "cdn.example.com",
    host: "cdn.example.com", path: "/ws", alpn: ["h2", "http/1.1"],
  } },
  { name: "vless-grpc-tls", input: {
    sourceType: "xray-json", protocol: "vless", address: "1.2.3.4", port: 2053,
    uuid: UUID_B, network: "grpc", security: "tls", sni: "grpc.example.com",
    serviceName: "GunService", mode: "gun",
  } },
  { name: "vmess-ws-tls", input: {
    sourceType: "vmess-url", protocol: "vmess", address: "vm.example.com", port: 443,
    uuid: UUID_B, network: "ws", security: "tls", sni: "vm.example.com",
    host: "vm.example.com", path: "/vmess",
  } },
  { name: "vmess-tcp-none", input: {
    sourceType: "vmess-url", protocol: "vmess", address: "203.0.113.5", port: 80,
    uuid: UUID_A, network: "tcp", security: "none",
  } },
  { name: "trojan-tcp-tls", input: {
    sourceType: "trojan-url", protocol: "trojan", address: "tj.example.com", port: 443,
    password: "trojan-pass", network: "tcp", security: "tls", sni: "tj.example.com",
  } },
  { name: "trojan-ws-tls", input: {
    sourceType: "trojan-url", protocol: "trojan", address: "tj2.example.com", port: 8443,
    password: "p@ss", network: "ws", security: "tls", sni: "tj2.example.com", path: "/tj",
  } },
  { name: "shadowsocks-tcp", input: {
    sourceType: "ss-url", protocol: "shadowsocks", address: "ss.example.com", port: 8388,
    password: "ss-secret", method: "aes-256-gcm", network: "tcp", security: "none",
  } },
  { name: "shadowsocks-ipv6", input: {
    sourceType: "ss-url", protocol: "shadowsocks", address: "2001:db8::1", port: 8388,
    password: "ss-secret", method: "chacha20-ietf-poly1305", network: "tcp", security: "none",
  } },
  { name: "hysteria2-udp", input: {
    sourceType: "hysteria2-url", protocol: "hysteria2", address: "hy.example.com", port: 443,
    password: "hy-pass", network: "quic", security: "tls", sni: "hy.example.com",
  } },
  { name: "tuic-quic", input: {
    sourceType: "tuic-url", protocol: "tuic", address: "tuic.example.com", port: 443,
    uuid: UUID_A, password: "tuic-pass", network: "quic", security: "tls", sni: "tuic.example.com",
  } },
  { name: "wireguard-endpoint", input: {
    sourceType: "wireguard-config", protocol: "wireguard", address: "wg.example.com", port: 51820,
    network: "tcp", security: "none",
  } },
  { name: "vless-httpupgrade-tls", input: {
    sourceType: "xray-json", protocol: "vless", address: "hu.example.com", port: 443,
    uuid: UUID_B, network: "http-upgrade", security: "tls", sni: "hu.example.com", path: "/hu",
  } },
  { name: "vless-xhttp-reality", input: {
    sourceType: "xray-json", protocol: "vless", address: "xh.example.com", port: 443,
    uuid: UUID_A, network: "xhttp", security: "reality", sni: "www.apple.com",
    pbk: "anotherpublickey", sid: "ff",
  } },
  { name: "vmess-grpc-tls", input: {
    sourceType: "singbox-json", protocol: "vmess", address: "5.6.7.8", port: 443,
    uuid: UUID_B, network: "grpc", security: "tls", sni: "g.example.com", serviceName: "Tun",
  } },
  { name: "trojan-grpc-tls", input: {
    sourceType: "clash-meta-yaml", protocol: "trojan", address: "tg.example.com", port: 443,
    password: "tg", network: "grpc", security: "tls", sni: "tg.example.com", serviceName: "GrpcSvc",
  } },
  { name: "shadowsocks-ws-tls", input: {
    sourceType: "clash-yaml", protocol: "shadowsocks", address: "sw.example.com", port: 443,
    password: "sw", method: "aes-128-gcm", network: "ws", security: "tls", sni: "sw.example.com", path: "/sw",
  } },
  { name: "vless-tcp-none", input: {
    sourceType: "vless-url", protocol: "vless", address: "9.9.9.9", port: 12345,
    uuid: UUID_A, network: "tcp", security: "none",
  } },
  { name: "hysteria2-with-alpn", input: {
    sourceType: "hysteria2-url", protocol: "hysteria2", address: "hy3.example.com", port: 8443,
    password: "hp", network: "quic", security: "tls", sni: "hy3.example.com", alpn: ["h3"],
  } },
  { name: "tuic-ipv4", input: {
    sourceType: "tuic-url", protocol: "tuic", address: "198.51.100.7", port: 443,
    uuid: UUID_B, password: "tp", network: "quic", security: "tls", sni: "t.example.com",
  } },
];

/**
 * Broken nodes that the Validation Engine MUST flag (overallValid === false).
 * These are structurally constructible (so createNode succeeds) but semantically
 * invalid — exactly the Validation Engine's job to catch.
 * @type {{ name: string, input: NodeInput, expect: string }[]}
 */
export const INVALID_FIXTURES = [
  { name: "vless-bad-uuid", expect: "uuidValid=false", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    uuid: "not-a-real-uuid", network: "tcp", security: "tls", sni: "example.com",
  } },
  { name: "vmess-missing-uuid", expect: "uuidValid=false", input: {
    sourceType: "vmess-url", protocol: "vmess", address: "example.com", port: 443,
    network: "tcp", security: "none",
  } },
  { name: "reality-without-pbk", expect: "realityValid=false", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    uuid: UUID_A, network: "tcp", security: "reality", sni: "www.microsoft.com",
  } },
  { name: "bad-host-header", expect: "hostValid=false", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    uuid: UUID_A, network: "ws", security: "tls", sni: "example.com", host: "bad host name", path: "/ws",
  } },
  { name: "bad-path", expect: "pathValid=false", input: {
    sourceType: "trojan-url", protocol: "trojan", address: "example.com", port: 443,
    password: "p", network: "ws", security: "tls", sni: "example.com", path: "no-leading-slash",
  } },
  { name: "port-out-of-range", expect: "portValid=false", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 70000,
    uuid: UUID_A, network: "tcp", security: "none",
  } },
];

/**
 * Inputs that must be REJECTED at construction time (createNode throws) — the
 * UNM invariant boundary (05 Rules 1-8). Port/address are required & typed.
 * @type {{ name: string, input: NodeInput }[]}
 */
export const UNCONSTRUCTIBLE_FIXTURES = [
  { name: "non-integer-port", input: {
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 70000.5,
    uuid: UUID_A,
  } },
  { name: "empty-address", input: {
    sourceType: "trojan-url", protocol: "trojan", address: "", port: 443, password: "p",
  } },
  { name: "unknown-protocol", input: {
    sourceType: "vless-url", protocol: "carrier-pigeon", address: "example.com", port: 443,
  } },
];
