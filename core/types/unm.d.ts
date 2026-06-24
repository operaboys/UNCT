/**
 * Universal Node Model (UNM) — canonical type definitions.
 *
 * Source of truth: docs/blueprints/05-UNIVERSAL_NODE_MODEL.md (v1.4, Freeze zone).
 * No field may be added or removed here without a new ADR (ANTI_CHAOS Rule 13).
 *
 * These are TYPES ONLY (`.d.ts`). Runtime enums / defaults live in
 * core/unm/schema/ per ADR-002 §"Phase 1 implementation".
 */

// ===== Enums (spec 05 §2) =====

export type SourceType =
  | "xray-json" | "singbox-json" | "clash-yaml" | "clash-meta-yaml"
  | "vless-url" | "vmess-url" | "trojan-url" | "ss-url"
  | "hysteria2-url" | "tuic-url" | "wireguard-config" | "subscription";

export type Protocol =
  | "vless" | "vmess" | "trojan" | "shadowsocks"
  | "hysteria2" | "tuic" | "wireguard";

export type NetworkType =
  | "tcp" | "ws" | "grpc" | "http-upgrade" | "kcp" | "quic" | "xhttp";

export type SecurityType =
  | "none" | "tls" | "reality";

export type DnsLeakRisk = "none" | "low" | "medium" | "high";

// ===== Sub-objects =====

/** Metadata Object — spec 05 §3. Produced by the Parser. */
export interface MetadataObject {
  parser: string;
  confidence: number;            // 0-100
  sourceFile?: string;
  sourceLine?: number;
  formatVersion?: string;
  warnings: string[];            // never null — always an array
  errors: string[];              // never null — always an array
  recoveryActions: string[];     // Fuzzy Recovery changes recorded here
  originalMappings: Record<string, string>; // synonym-name -> canonical UNM name
}

/** Analysis Object — spec 05 §4. Filled by the Analyzer Engine (optional). */
export interface AnalysisObject {
  riskScore: number;             // 0-100
  securityScore: number;         // 0-100
  compatibilityScore: number;    // 0-100
  cloudflareDetected: boolean;
  realityDetected: boolean;
  workerDetected: boolean;
  cleanIPDetected: boolean;
  dnsLeakRisk: DnsLeakRisk;
}

/**
 * Validation Object — spec 05 §5. Filled by the Validation Engine.
 * `null` on a per-field flag means the field is meaningless for this protocol.
 */
export interface ValidationObject {
  addressValid: boolean;
  portValid: boolean;
  uuidValid: boolean | null;
  realityValid: boolean | null;
  tlsValid: boolean | null;
  alpnValid: boolean | null;
  pathValid: boolean | null;
  hostValid: boolean | null;
  overallValid: boolean;         // logical AND of the above (null = neutral)
}

/** Conversion Object — spec 05 §6. Filled by the Converter Engine (optional). */
export interface ConversionObject {
  canConvertToVLESS: boolean;
  canConvertToVMESS: boolean;
  canConvertToTrojan: boolean;
  canConvertToSS: boolean;
  canConvertToTUIC: boolean;
  canConvertToHysteria2: boolean;
  canConvertToWireGuard: boolean;
}

// ===== The Node (spec 05 §2) =====

/**
 * The Universal Node Model node. Immutable (spec 05 Rule 8): any change must
 * produce a new instance (structural sharing), never an in-place mutation.
 */
export interface UNMNode {
  // ----- Identification -----
  nodeId: string;                // UUID v4, system-generated (never from input)
  sourceType: SourceType;
  sourceVersion?: string;

  // ----- Protocol identity -----
  protocol: Protocol;
  address: string;               // domain or IP (never a DNS address)
  port: number;                  // 1-65535

  // ----- Authentication -----
  uuid?: string;                 // VLESS / VMESS
  password?: string;             // Trojan / SS / Hysteria2
  method?: string;               // SS encryption method (e.g. aes-256-gcm)
  encryption?: string;           // VLESS encryption (usually "none")

  // ----- Network & security -----
  network: NetworkType;          // default "tcp"
  security: SecurityType;        // default "none"
  host?: string;                 // Header Host (WS/HTTPUpgrade)
  path?: string;                 // WS/gRPC/HTTPUpgrade path
  sni?: string;                  // TLS/Reality SNI
  alpn?: string[];               // e.g. ["h2", "http/1.1"]
  fingerprint?: string;          // uTLS fingerprint (chrome, firefox, ...)

  // ----- Reality -----
  pbk?: string;                  // Reality Public Key (canonical name)
  sid?: string;                  // Reality Short ID (canonical name)

  // ----- Transport features -----
  flow?: string;                 // VLESS flow (xtls-rprx-vision, ...)
  serviceName?: string;          // gRPC service name
  authority?: string;            // gRPC authority
  mode?: string;                 // gRPC mode (gun/multi)
  headerType?: string;           // TCP/KCP header obfuscation type
  earlyData?: boolean;           // WS Early Data

  // ----- User metadata -----
  remark?: string;
  group?: string;
  tags?: string[];

  // ----- Timestamps -----
  createdAt: string;             // ISO 8601, system-generated
  updatedAt: string;             // ISO 8601, system-generated

  // ----- Related objects -----
  metadata: MetadataObject;
  analysis?: AnalysisObject;     // empty until the Analyzer runs
  validation: ValidationObject;  // always present after Parse
  conversion?: ConversionObject; // empty until the Converter runs

  // ----- Plugin extension point (spec 05 §2) -----
  extensions?: Record<string, unknown>;
}
