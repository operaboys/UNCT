/**
 * WireGuard `.conf` fixtures (wg-quick text format). A config has one
 * [Interface] and one-or-more [Peer] sections, so it is a multi-node source.
 */

/** Two peers sharing one interface (multi-node), incl. an IPv6 endpoint. */
export const MULTI_PEER = `# my tunnel
[Interface]
PrivateKey = PRIVKEY123=
Address = 10.0.0.2/32
DNS = 1.1.1.1, 8.8.8.8
MTU = 1420

[Peer]
PublicKey = PEER1PUB=
PresharedKey = PSK1=
Endpoint = wg1.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

[Peer]
PublicKey = PEER2PUB=
Endpoint = [2001:db8::1]:51821
AllowedIPs = 10.0.0.0/24
`;

/** A minimal single-peer config. */
export const SINGLE_PEER = `[Interface]
PrivateKey = SOLOPRIV=

[Peer]
PublicKey = SOLOPUB=
Endpoint = solo.example.com:51820
AllowedIPs = 0.0.0.0/0
`;

/** Misspelled section header [Peers] — Stage 11 fuzzy-recovery target. */
export const MISSPELLED_SECTION = `[Interface]
PrivateKey = P=

[Peers]
PublicKey = PUB=
Endpoint = rec.example.com:51820
AllowedIPs = 0.0.0.0/0
`;

/** A peer with no Endpoint — must yield NO node; the valid sibling still parses. */
export const PEER_NO_ENDPOINT = `[Interface]
PrivateKey = P=

[Peer]
PublicKey = NOEP=
AllowedIPs = 0.0.0.0/0

[Peer]
PublicKey = OKPUB=
Endpoint = ok.example.com:51820
AllowedIPs = 0.0.0.0/0
`;

/** An [Interface] with no [Peer] — no node can exist. */
export const NO_PEER = `[Interface]
PrivateKey = P=
Address = 10.0.0.2/32
`;
