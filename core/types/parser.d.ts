/**
 * Parser Engine — type contract (12-PARSER_FACTORY §2, 04-PARSER_ENGINE Stages 04-11).
 *
 * `BaseParser` is the Architecture-Stable contract (Anti-Chaos Rule 13 —
 * Parser Factory is in the Architecture Freeze Scope): every format parser
 * (Xray, Sing-box, Clash, URL, Subscription, WireGuard, ...) must implement
 * exactly these five methods, plus the two reserved async fields. Changing
 * this method signature set requires a Full ADR.
 *
 * `RawExtraction` / `ParseError` are intentionally generic stubs — the
 * blueprint does not pin their exact shape, only that `parse()` produces one
 * and `recover()` consumes the other. Concrete parsers (Phase 2 steps after
 * this one) may add fields under `fields`/`cause` without needing an ADR;
 * only the BaseParser method contract itself is frozen.
 */

import type { UNMNode, ValidationObject } from "./unm";

/** Raw, not-yet-normalized fields extracted by a parser (Stages 04-09). */
export interface RawExtraction {
  /** Raw protocol token as seen in the input, before enum normalization. */
  protocol?: string;
  /** Every field the parser managed to pull out, raw value, keyed by its raw name. */
  fields: Record<string, unknown>;
  /** Synonym field name -> canonical UNM name (05-UNIVERSAL_NODE_MODEL §3 originalMappings). */
  originalMappings?: Record<string, string>;
  /** Non-fatal notes produced while extracting (Stage 01/10 style warnings). */
  warnings?: string[];
  /** Structural repairs applied during recovery (Stage 10/11) — never security data. */
  recoveryActions?: string[];
  /** Original input (or the relevant slice of it), kept for recovery/debugging. */
  raw?: string;
}

/** A parsing failure, passed into `recover()` (Stage 10 Error Recovery / Stage 11 Fuzzy Recovery). */
export interface ParseError {
  message: string;
  stage: "extract" | "structure" | "normalize";
  cause?: unknown;
}

/**
 * The contract every format parser implements (12-PARSER_FACTORY §2).
 * Parsers are never instantiated directly — only through `ParserFactory`
 * (12 §6.1).
 */
export interface BaseParser {
  /** Confidence Score 0-100 that `input` matches this parser's format (Stage 02). */
  detect(input: string): number;

  /** Extract raw fields. Always synchronous for current (non-Plugin) parsers. */
  parse(input: string): RawExtraction;

  /**
   * Validate only the STRUCTURE of `extraction` produced by THIS parser (e.g.
   * "address field is not empty") — NOT the central Validation Engine
   * (Stage 13, `core/validator/`). Named `validateStructure` (not `validate`)
   * specifically to avoid that confusion (12 §2 correction).
   */
  validateStructure(extraction: RawExtraction): ValidationObject;

  /** Produce the final UNMNode (Stage 14, 05-UNIVERSAL_NODE_MODEL). */
  normalize(extraction: RawExtraction): UNMNode;

  /**
   * Recover a usable `RawExtraction` from broken input (Stage 10/11), or
   * `null` if nothing could be recovered. Structure/Syntax only — recovery
   * must NEVER invent uuid, password, pbk, sid, or any other security field
   * (absolute rule, 04-PARSER_ENGINE Stage 11).
   *
   * `error` is the failure from a preceding `parse()` when the factory drives
   * recovery; it is optional so recovery can also be invoked directly.
   */
  recover(input: string, error?: ParseError): RawExtraction | null;

  // ===== Reserved for future async Plugin Parsers (Phase 11) =====
  /** Default false. Current (non-Plugin) parsers must not set this. */
  isAsync?: boolean;
  /** Only valid when `isAsync` is true. */
  parseAsync?(input: string): Promise<RawExtraction>;

  // ===== Optional advisory hints (12 §2.1) =====
  /**
   * Hints are advisory only (12 §2.1 absolute rule): they must NEVER affect
   * Parser Selection, Validation, or Normalization — display/debug use only.
   */
  analyzeHint?(): Record<string, unknown>;
  metadataHint?(): Record<string, unknown>;
  formatVersion?(): string;
}
