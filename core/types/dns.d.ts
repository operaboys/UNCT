/**
 * Config-level DNS settings extracted during parsing (ADR-022).
 * Stored per-node under `extensions.configDns` for Xray/Sing-box/Clash nodes.
 *
 * NOT part of the frozen UNMNode core (spec 05 §2). Lives in the `extensions`
 * escape hatch (spec 05 §8 "Core vs Runtime Extensions").
 *
 * Rule 9 (never fabricate): absent means the source format carries no
 * extractable DNS block. Consumers must treat absent configDns as "unknown
 * risk", not "safe".
 *
 * WireGuard (.conf source type) uses `extensions.wireguard.dns` instead —
 * see ADR-007 and ADR-022.
 */

export interface ConfigDns {
  /** Raw DNS server address strings, preserved as-is from the config.
   *  Examples: "8.8.8.8", "tls://dns.google", "127.0.0.1",
   *  "https://cloudflare-dns.com/dns-query"
   *  Combined from all applicable server pools:
   *  - Xray: dns.servers (string items + object items' .address)
   *  - Sing-box: dns.servers[].address
   *  - Clash: dns.nameserver + dns.fallback + dns.default-nameserver
   */
  servers: string[];

  /** True when FakeIP mode is explicitly enabled in this config.
   *  Xray: dns.fakeIp.enabled === true
   *  Sing-box: dns.fakeip.enabled === true
   *  Clash: dns.enhanced-mode === "fake-ip"
   */
  fakeIp: boolean;

  /** Mode/strategy string, preserved raw.
   *  Xray: dns.queryStrategy ("UseIPv4" | "UseIPv6" | "UseIP")
   *  Clash: dns.enhanced-mode ("fake-ip" | "redir-host")
   *  Sing-box: absent — routing is per-rule, not a single strategy.
   */
  strategy?: string;
}
