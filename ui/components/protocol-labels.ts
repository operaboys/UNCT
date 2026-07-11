/**
 * Protocol/Security display-label maps (07-UI_UX_SYSTEM §2's protocol badge
 * spec) — shared, presentation-only lookup tables used by every screen that
 * shows a node's protocol/security type (Dashboard, Converter, and future
 * redesigns). Pulled out of `ui/dashboard/format.ts` (final visual design
 * phase, Converter step) so a second screen needing the same labels imports
 * one definition instead of a second copy — same reasoning as
 * `ui/components/logo.tsx`/`nav.tsx`. Purely presentational: these never
 * originate from Core, they only relabel a `Protocol`/`SecurityType` value
 * Core already produced (Rule 11's boundary).
 */
import type { Protocol, SecurityType } from "../../core/types/unm";

/** Two-letter Monospace abbreviation per protocol (07-UI_UX_SYSTEM §2's protocol badge spec). */
export const PROTOCOL_ABBREVIATION: Record<Protocol, string> = {
  vless: "VL",
  vmess: "VM",
  trojan: "TR",
  shadowsocks: "SS",
  hysteria2: "HY",
  tuic: "TU",
  wireguard: "WG",
};

/** Real branding casing per protocol (raw `node.protocol` values are all lowercase). */
export const PROTOCOL_DISPLAY_NAME: Record<Protocol, string> = {
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  shadowsocks: "Shadowsocks",
  hysteria2: "Hysteria2",
  tuic: "TUIC",
  wireguard: "WireGuard",
};

/** Real branding casing per security type (raw `node.security` values are all lowercase). */
export const SECURITY_TYPE_DISPLAY_NAME: Record<SecurityType, string> = {
  none: "None",
  tls: "TLS",
  reality: "Reality",
};
