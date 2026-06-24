/**
 * Sing-box JSON fixtures. Sing-box configs are an array of typed outbounds
 * (plus newer `endpoints`), so they are multi-node sources.
 */

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";

/** A realistic multi-outbound config: 4 proxies + non-proxy outbounds to skip. */
export const MULTI = JSON.stringify({
  outbounds: [
    { type: "selector", tag: "select", outbounds: ["a", "b"] },
    {
      type: "vless", tag: "reality-node", server: "ex.example.com", server_port: 443,
      uuid: UUID, flow: "xtls-rprx-vision",
      tls: {
        enabled: true, server_name: "sni.example.com",
        utls: { enabled: true, fingerprint: "chrome" },
        reality: { enabled: true, public_key: "PUB123", short_id: "ab12" },
      },
      transport: { type: "grpc", service_name: "gsvc" },
    },
    {
      type: "shadowsocks", tag: "ss-node", server: "ss.example.com", server_port: 8388,
      method: "aes-256-gcm", password: "sspass",
    },
    {
      type: "trojan", tag: "tj-node", server: "tj.example.com", server_port: 443, password: "tjpass",
      tls: { enabled: true, server_name: "tj.example.com", alpn: ["h2", "http/1.1"] },
      transport: { type: "ws", path: "/tw", headers: { Host: "tj.example.com" } },
    },
    {
      type: "wireguard", tag: "wg-node", server: "wg.example.com", server_port: 51820,
      private_key: "PRIVKEY", peer_public_key: "PEERKEY", pre_shared_key: "PSK",
      mtu: 1420, local_address: ["10.0.0.2/32", "fd00::2/128"],
    },
    { type: "direct", tag: "direct" },
    { type: "dns", tag: "dns-out" },
  ],
});

/** Single vmess outbound with websocket transport (vmess net spelling differs). */
export const SINGLE_VMESS = JSON.stringify({
  outbounds: [
    {
      type: "vmess", tag: "vm", server: "vm.example.com", server_port: 443, uuid: UUID,
      security: "auto", alter_id: 0,
      tls: { enabled: true, server_name: "vm.example.com" },
      transport: { type: "ws", path: "/v", headers: { Host: "vm.example.com" } },
    },
  ],
});

/** WireGuard via the modern `endpoints` array. */
export const ENDPOINTS_WG = JSON.stringify({
  endpoints: [
    {
      type: "wireguard", tag: "wg-ep", server: "ep.example.com", server_port: 51820,
      private_key: "EPRIV", peer_public_key: "EPEER", mtu: 1280,
    },
  ],
});

/** Broken JSON (trailing comma + comment) but a recoverable sing-box shape. */
export const BROKEN = `{
  // exported
  "outbounds": [
    { "type": "trojan", "tag": "t", "server": "rec.example.com", "server_port": 443, "password": "p",
      "tls": { "enabled": true, "server_name": "rec.example.com" }, },
  ],
}`;

/** An outbound missing its server — must yield NO node, never a fabricated one. */
export const MISSING_SERVER = JSON.stringify({
  outbounds: [
    { type: "vless", tag: "broken", server_port: 443, uuid: UUID },
    { type: "trojan", tag: "ok", server: "ok.example.com", server_port: 443, password: "p" },
  ],
});

/** Only non-proxy outbounds — no nodes to extract. */
export const NO_PROXY = JSON.stringify({ outbounds: [{ type: "direct" }, { type: "block" }] });

export { UUID };
