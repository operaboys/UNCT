/**
 * ParserFactory — the single entry point for parser registration and
 * selection (12-PARSER_FACTORY §4, §6.1). Direct instantiation of a parser
 * (`new XrayParser()`) is forbidden by the blueprint; every parser is
 * registered here and obtained through this factory.
 *
 * Pure logic, no I/O — directly unit-testable (15-TESTING_FRAMEWORK).
 *
 * @typedef {import("../types/parser").BaseParser} BaseParser
 * @typedef {import("../types/parser").RawExtraction} RawExtraction
 * @typedef {import("../types/parser").ParseError} ParseError
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import { assertImplementsBaseParser } from "./base/contract.js";

/** Stage 02: Confidence < 50% -> "Unknown Format". */
export const UNKNOWN_FORMAT_THRESHOLD = 50;

/**
 * Expand an extraction into ALL its nodes, dispatching on `producesMany`
 * (ADR-008) so callers never have to know whether a parser is single- or
 * multi-node. Single-node parsers yield a one-element array; multi-node
 * parsers (Subscription) yield every node. This is the safe path that prevents
 * the "call normalize(), silently lose the rest" footgun (ANTI_CHAOS Rule 9).
 *
 * @param {BaseParser} parser
 * @param {RawExtraction} extraction
 * @returns {Readonly<UNMNode>[]}
 */
export function normalizeAll(parser, extraction) {
  if (parser.producesMany) {
    if (typeof parser.normalizeMany !== "function") {
      throw new Error("normalizeAll: parser.producesMany is true but normalizeMany() is missing (PARSE_CONTRACT_VIOLATION)");
    }
    return parser.normalizeMany(extraction);
  }
  return [parser.normalize(extraction)];
}

/**
 * @typedef {{ name: string, confidence: number }} Candidate
 */

/**
 * Create an independent ParserFactory instance. The app composition root
 * creates one instance and registers the real parsers on it (Xray, Sing-box,
 * Clash, URL, Subscription, WireGuard, ...); tests create their own
 * instances so registrations never leak between test files.
 */
export function createParserFactory() {
  /** @type {Map<string, BaseParser>} */
  const registry = new Map();

  /**
   * Register a parser under `name`. Throws if the parser does not satisfy
   * the BaseParser contract (12 §2) or if `name` is already taken.
   * @param {string} name
   * @param {BaseParser} parser
   */
  function register(name, parser) {
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("ParserFactory.register: name must be a non-empty string (PARSE_CONTRACT_VIOLATION)");
    }
    if (registry.has(name)) {
      throw new Error(`ParserFactory.register: "${name}" is already registered (PARSE_CONTRACT_VIOLATION)`);
    }
    assertImplementsBaseParser(parser, name);
    registry.set(name, parser);
  }

  /**
   * @param {string} name
   * @returns {BaseParser}
   */
  function get(name) {
    const parser = registry.get(name);
    if (!parser) {
      throw new Error(`ParserFactory.get: no parser registered as "${name}" (PARSE_CONTRACT_VIOLATION)`);
    }
    return parser;
  }

  /** @returns {string[]} registered parser names */
  function list() {
    return [...registry.keys()];
  }

  /**
   * Run `detect()` on every registered parser (Stage 02/03) and rank them.
   * @param {string} input
   * @returns {Candidate[]} sorted, highest confidence first
   */
  function detectCandidates(input) {
    /** @type {Candidate[]} */
    const candidates = [];
    for (const [name, parser] of registry) {
      candidates.push({ name, confidence: parser.detect(input) });
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates;
  }

  /**
   * Highest-Confidence-Wins selection (12 §4). Returns `null` ("Unknown
   * Format") when no candidate clears `UNKNOWN_FORMAT_THRESHOLD`.
   * @param {string} input
   * @returns {{ name: string, parser: BaseParser, candidates: Candidate[] } | null}
   */
  function selectParser(input) {
    const candidates = detectCandidates(input);
    const top = candidates[0];
    if (!top || top.confidence < UNKNOWN_FORMAT_THRESHOLD) return null;
    return { name: top.name, parser: get(top.name), candidates };
  }

  /**
   * Recovery Strategy fallback chain (12 §5): Primary Parser Failed ->
   * Secondary Parser (next highest confidence) -> next candidate, in
   * descending confidence order. Each candidate gets one `parse()` attempt
   * and, on failure, one `recover()` attempt before the chain moves on.
   * @param {string} input
   * @returns {{ name: string, extraction: RawExtraction, recovered: boolean }}
   * @throws {Error} if every candidate (parse + recover) fails, or if no
   *   candidate reaches the confidence threshold ("Unknown Format")
   */
  function parseWithFallback(input) {
    const candidates = detectCandidates(input)
      .filter((c) => c.confidence >= UNKNOWN_FORMAT_THRESHOLD);
    if (candidates.length === 0) {
      throw new Error("ParserFactory.parseWithFallback: Unknown Format — no candidate reached the confidence threshold (PARSE_CONTRACT_VIOLATION)");
    }

    /** @type {unknown} */
    let lastError;
    for (const { name } of candidates) {
      const parser = get(name);
      try {
        return { name, extraction: parser.parse(input), recovered: false };
      } catch (err) {
        lastError = err;
        /** @type {ParseError} */
        const parseError = {
          message: err instanceof Error ? err.message : String(err),
          stage: "extract",
          cause: err,
        };
        const recovered = parser.recover(input, parseError);
        if (recovered) return { name, extraction: recovered, recovered: true };
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return { register, get, list, detectCandidates, selectParser, parseWithFallback };
}

/**
 * Shared app-wide factory instance. Concrete parsers (Phase 2 steps after
 * this one) register themselves here at module load time.
 */
export const parserFactory = createParserFactory();
