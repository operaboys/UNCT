/**
 * Clash / Clash.Meta YAML fixtures. A Clash config has a `proxies:` array, so
 * it is a multi-node source.
 */

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";

/** Multi-proxy Clash.Meta config: 4 proxies + a non-proxy group to skip. */
export const MULTI = `
proxies:
  - name: reality-node
    type: vless
    server: ex.example.com
    port: 443
    uuid: ${UUID}
    network: grpc
    flow: xtls-rprx-vision
    servername: sni.example.com
    client-fingerprint: chrome
    reality-opts:
      public-key: PUB123
      short-id: ab12
    grpc-opts:
      grpc-service-name: gsvc
  - name: ss-node
    type: ss
    server: ss.example.com
    port: 8388
    cipher: aes-256-gcm
    password: sspass
  - name: trojan-node
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
  - name: wg-node
    type: wireguard
    server: wg.example.com
    port: 51820
    private-key: PRIVKEY
    public-key: PEERKEY
    pre-shared-key: PSK
    ip: 10.0.0.2/32
    mtu: 1420
proxy-groups:
  - name: auto
    type: select
    proxies: [reality-node, ss-node]
`;

/** Single vmess+ws proxy (cipher -> encryption). */
export const SINGLE_VMESS = `
proxies:
  - name: vm
    type: vmess
    server: vm.example.com
    port: 443
    uuid: ${UUID}
    cipher: auto
    network: ws
    tls: true
    servername: vm.example.com
    ws-opts:
      path: /v
      headers:
        Host: vm.example.com
`;

/** Broken YAML: TAB indentation (YAML forbids tabs) — Stage 10 recovery target. */
export const BROKEN_TABS = "proxies:\n\t- name: t\n\t  type: trojan\n\t  server: rec.example.com\n\t  port: 443\n\t  password: p\n";

/** A proxy missing its server — must yield NO node (never fabricated). */
export const MISSING_SERVER = `
proxies:
  - name: broken
    type: vless
    port: 443
    uuid: ${UUID}
  - name: ok
    type: trojan
    server: ok.example.com
    port: 443
    password: p
`;

/** No proxies key at all. */
export const NO_PROXIES = "rules:\n  - MATCH,DIRECT\n";

export { UUID };
