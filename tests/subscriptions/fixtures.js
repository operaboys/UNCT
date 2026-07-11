/**
 * Subscription fixtures. A subscription is a list of config URLs delivered as
 * plain text or a Base64 blob.
 */

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";

export const LINE_VLESS = `vless://${UUID}@a.example.com:443?security=tls&sni=a.example.com#A`;
export const LINE_TROJAN = "trojan://tjpass@b.example.com:443?security=tls&sni=b.example.com#B";
export const LINE_VMESS = "vmess://" + btoa(JSON.stringify({
  v: "2", ps: "C", add: "c.example.com", port: "443", id: UUID, net: "ws", tls: "tls", path: "/c",
}));
export const LINE_SS = "ss://" + btoa("aes-256-gcm:sspass") + "@d.example.com:8388#D";

/** Plain, mixed-protocol subscription (4 distinct nodes). */
export const PLAIN_MIXED = [LINE_VLESS, LINE_TROJAN, LINE_VMESS, LINE_SS].join("\n");

/** Same content, Base64-encoded (the common subscription delivery form). */
export const BASE64_MIXED = btoa(PLAIN_MIXED);

/** Plain subscription with a duplicate payload line. */
export const PLAIN_WITH_DUPLICATE = [LINE_VLESS, LINE_TROJAN, LINE_VLESS].join("\n");

/** Subscription mixing valid URLs with a comment line and a broken line. */
export const PLAIN_WITH_JUNK =
  ["# my subscription", LINE_VLESS, "this is not a url", "vmess://!!!broken!!!", LINE_TROJAN].join("\n");

/** A URL line with no uuid — the produced node must be invalid, not fabricated. */
export const PLAIN_NO_UUID = [`vless://@nouuid.example.com:443?type=tcp#bad`, LINE_TROJAN].join("\n");

/** Base64 blob with stray junk characters injected (Stage 10 recovery). */
export const BASE64_DIRTY = BASE64_MIXED.replace(/(.{12})/, "$1**");

/** Empty / whitespace-only. */
export const EMPTY = "   \n  \n";

/** Looks like Base64 but decodes to no URLs (broken Base64 subscription). */
export const BROKEN_BASE64 = "bm90LWEtc3Vic2NyaXB0aW9uLXBheWxvYWQtYXQtYWxs";

export { UUID };
