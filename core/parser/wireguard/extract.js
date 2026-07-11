/**
 * WireGuard field extraction — 04-PARSER_ENGINE Stage 09.
 *
 * Parses the standard WireGuard text format (wg-quick `.conf`): an `[Interface]`
 * section plus one or more `[Peer]` sections. Each `[Peer]` is a distinct remote
 * endpoint, so this is a MULTI-NODE source (ADR-008): one node per peer, with
 * the shared `[Interface]` fields (PrivateKey/DNS/MTU) applied to each.
 *
 * Extracted fields (Stage 09): Private Key, Public Key, Endpoint, Allowed IPs,
 * DNS, MTU, Persistent Keepalive. (The interface `Address` is intentionally not
 * extracted — it is not in the Stage 09 list nor the ADR-007 namespace.)
 *
 * @typedef {import("../../types/parser").RawExtraction} RawExtraction
 */

/**
 * @typedef {{ name: string, entries: Record<string, string> }} IniSection
 */

/**
 * Parse the INI-like WireGuard format into ordered sections. Keys are
 * lower-cased for stable lookup; `#`/`;` comments and blanks are skipped.
 * @param {string} text
 * @returns {IniSection[]}
 */
export function parseIni(text) {
  /** @type {IniSection[]} */
  const sections = [];
  /** @type {IniSection | null} */
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith(";")) continue;
    const header = /^\[(.+?)\]$/.exec(line);
    if (header) {
      current = { name: header[1].trim().toLowerCase(), entries: {} };
      sections.push(current);
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 0 || !current) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();
    if (key.length > 0) current.entries[key] = value;
  }
  return sections;
}

/**
 * Turn parsed sections into one raw-field record per `[Peer]`, each carrying the
 * shared `[Interface]` fields. Returns [] if there is no peer (no node).
 * @param {IniSection[]} sections
 * @returns {Record<string, unknown>[]}
 */
export function itemsFromSections(sections) {
  const iface = sections.find((s) => s.name === "interface");
  const peers = sections.filter((s) => s.name === "peer");
  const ifaceEntries = iface ? iface.entries : {};

  return peers.map((peer) => {
    const p = peer.entries;
    /** @type {Record<string, unknown>} */
    const f = {};
    // [Interface] — shared across every peer/node.
    if (ifaceEntries.privatekey != null) f.privatekey = ifaceEntries.privatekey;
    if (ifaceEntries.dns != null) f.dns = ifaceEntries.dns;
    if (ifaceEntries.mtu != null) f.mtu = ifaceEntries.mtu;
    // [Peer]
    if (p.publickey != null) f.publickey = p.publickey;
    if (p.presharedkey != null) f.presharedkey = p.presharedkey;
    if (p.endpoint != null) f.endpoint = p.endpoint;
    if (p.allowedips != null) f.allowedips = p.allowedips;
    if (p.persistentkeepalive != null) f.persistentkeepalive = p.persistentkeepalive;
    return f;
  });
}

/**
 * parse() — Stage 09 happy path. Throws (routing to recover()) on a config with
 * no `[Peer]` section (no node can exist without an endpoint).
 * @param {string} input
 * @returns {RawExtraction}
 */
export function parseWireguard(input) {
  if (typeof input !== "string") {
    throw new Error("WireGuardParser.parse: input must be a string (PARSE_MISSING_REQUIRED)");
  }
  const items = itemsFromSections(parseIni(input));
  if (items.length === 0) {
    throw new Error("WireGuardParser.parse: no [Peer] section found (PARSE_MISSING_REQUIRED)");
  }
  return { protocol: "wireguard", fields: { items }, raw: input };
}
