/**
 * URL fixtures for the URLParser unit tests. Plain strings — the parser
 * consumes raw URL text (after its own Stage 12 preprocessing).
 */

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";

/** VLESS + Reality + gRPC; `fp` is the URL synonym for fingerprint. */
export const VLESS_REALITY =
  `vless://${UUID}@example.com:443?encryption=none&security=reality` +
  `&sni=www.microsoft.com&fp=chrome&pbk=PUBKEY123&sid=ab12&type=grpc` +
  `&serviceName=gsvc&flow=xtls-rprx-vision#My%20Node`;

/** VLESS + WS + TLS, with an encoded path and a Host header param. */
export const VLESS_WS_TLS =
  `vless://${UUID}@1.2.3.4:8443?security=tls&type=ws&sni=cdn.example.com` +
  `&path=%2Fws%2Fpath&host=cdn.example.com&alpn=h2,http/1.1&fp=firefox#ws-node`;

/** vmess:// is Base64(JSON). Built at import time from a known object. */
const VMESS_OBJ = {
  v: "2", ps: "vmess node", add: "vm.example.com", port: "443", id: UUID,
  net: "ws", type: "none", host: "h.com", path: "/vpath", tls: "tls",
  sni: "s.com", alpn: "h2,http/1.1", scy: "auto",
};
export const VMESS_WS = "vmess://" + btoa(JSON.stringify(VMESS_OBJ));

/** Shadowsocks SIP002: ss://base64(method:password)@host:port#remark. */
export const SS_SIP002 =
  "ss://" + btoa("aes-256-gcm:ss-password") + "@ss.example.com:8388#ss-node";

/** Shadowsocks legacy: ss://base64(method:password@host:port)#remark. */
export const SS_LEGACY =
  "ss://" + btoa("chacha20-ietf-poly1305:legacy-pass@ss2.example.com:8389") + "#ss-legacy";

/** Trojan + WS + TLS. */
export const TROJAN_WS =
  "trojan://trojan-pass@t.example.com:443?security=tls&sni=t.example.com" +
  "&type=ws&path=/tp&host=t.example.com#trojan-node";

/** TUIC: userinfo = uuid:password. */
export const TUIC =
  `tuic://${UUID}:tuic-pass@tu.example.com:443?sni=tu.example.com&alpn=h3#tuic-node`;

/** Hysteria2 via the hy2:// alias (maps to hysteria2). */
export const HY2 =
  "hy2://hy2-pass@hy.example.com:8443?sni=hy.example.com#hy2-node";

/** WireGuard — keys go to extensions, never onto the frozen UNM core. */
export const WIREGUARD =
  "wireguard://privkeyAAA@wg.example.com:51820?publickey=pubkeyBBB&presharedkey=pskCCC#wg-node";

/** Misspelled scheme — Stage 11 fuzzy recovery target (vmes -> vmess). */
export const MISSPELLED_SCHEME = "vmes://" + btoa(JSON.stringify(VMESS_OBJ));

/** vmess with stray non-Base64 junk in the payload (Stage 10 repair). The
 *  scheme is valid (detect=95) but parse() fails until recovery sanitizes it. */
export const VMESS_DIRTY_BASE64 =
  "vmess://" + btoa(JSON.stringify(VMESS_OBJ)).replace(/(.{10})/, "$1!!");

/** VLESS with NO userinfo (no uuid) — recovery must NOT invent one. */
export const VLESS_NO_UUID = "vless://@nouuid.example.com:443?type=tcp#no-uuid";

export { UUID };
