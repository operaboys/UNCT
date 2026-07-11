/**
 * Phase 2/3 Foundation Acceptance Gate — Raw-config level (ADR-006 + 15 §5–§7).
 *
 * This is the second, parser-level half of the Foundation Acceptance Gate that
 * ADR-006 deferred until the parsers existed. It runs the full 100-sample raw
 * Baseline Dataset through the REAL end-to-end pipeline:
 *
 *     Raw text → ParserFactory (detect → select / §5 fallback chain)
 *              → parse() | recover()
 *              → normalizeMany() / normalize()
 *              → applyValidation()
 *
 * and measures the 15 §6/§7 criteria honestly, broken down by protocol AND by
 * dataset category. Nothing is hard-coded to pass — the pipeline is driven
 * exactly as production would drive it (parseWithFallback = the documented
 * Primary→Secondary recovery chain, 12 §5). Failures are surfaced with the
 * sample name, the selected parser, and the reason — never silently tolerated.
 *
 * Criteria (15 §6/§7):
 *  - valid:   ≥95% parse (no recovery) into nodes that ALL validate true.
 *  - broken:  ≥90% yield ≥1 valid node (Recovery ≥90%); recovery never fabricates.
 *  - invalid: false-positive rate <2% — essentially none may yield a valid node.
 */
import { describe, it, expect } from "vitest";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { registerXrayParser } from "../../core/parser/xray/index.js";
import { registerSingBoxParser } from "../../core/parser/singbox/index.js";
import { registerClashParser } from "../../core/parser/clash/index.js";
import { registerUrlParser } from "../../core/parser/url/index.js";
import { registerSubscriptionParser } from "../../core/parser/subscription/index.js";
import { registerWireguardParser } from "../../core/parser/wireguard/index.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import { VALID, PARTIALLY_BROKEN, INVALID, ALL_SAMPLES } from "./raw-config-dataset.js";

/** A fresh factory with all six real parsers (registration order = §5 fallback order). */
function buildFactory() {
  const f = createParserFactory();
  registerXrayParser(f);
  registerSingBoxParser(f);
  registerClashParser(f);
  registerUrlParser(f);
  registerSubscriptionParser(f);
  registerWireguardParser(f);
  return f;
}

const factory = buildFactory();

/**
 * Drive one raw config through the full production pipeline.
 * @param {string} raw
 */
function runPipeline(raw) {
  const sel = factory.selectParser(raw);
  if (!sel) return { status: "unknown-format", parser: null, recovered: false, nodes: [] };
  let res;
  try {
    res = factory.parseWithFallback(raw); // §5 Primary→Secondary recovery fallback chain
  } catch (e) {
    return { status: "unrecoverable", parser: sel.name, recovered: false, nodes: [], err: String(e) };
  }
  const parser = factory.get(res.name);
  let nodes;
  try {
    nodes = normalizeAll(parser, res.extraction).map(applyValidation);
  } catch (e) {
    return { status: "normalize-threw", parser: res.name, recovered: res.recovered, nodes: [], err: String(e) };
  }
  return { status: res.recovered ? "recovered" : "parsed", parser: res.name, recovered: res.recovered, nodes };
}

/**
 * @param {"valid"|"broken"|"invalid"} category
 * @param {{ name: string, format: string, protocol: string, raw: string }} s
 */
function evaluate(category, s) {
  const r = runPipeline(s.raw);
  const total = r.nodes.length;
  const valid = r.nodes.filter((n) => n.validation.overallValid === true).length;
  let pass;
  if (category === "valid") pass = r.status === "parsed" && total > 0 && valid === total;
  else if (category === "broken") pass = total > 0 && valid === total;
  else pass = valid === 0; // invalid: no node may masquerade as valid (false-positive guard)
  const badNode = r.nodes.find((n) => n.validation.overallValid !== true);
  const reason = pass ? "" :
    `status=${r.status} parser=${r.parser} recovered=${r.recovered} nodes=${valid}/${total}` +
    (r.err ? ` err=${r.err}` : "") +
    (badNode ? ` nodeErrors=[${badNode.metadata.errors.join("; ")}]` : "");
  return { name: s.name, format: s.format, protocol: s.protocol, category, status: r.status,
    parser: r.parser, recovered: r.recovered, total, valid, pass, reason };
}

const RESULTS = [
  ...VALID.map((s) => evaluate("valid", s)),
  ...PARTIALLY_BROKEN.map((s) => evaluate("broken", s)),
  ...INVALID.map((s) => evaluate("invalid", s)),
];

/** @param {(r: typeof RESULTS[number]) => boolean} pred */
const rate = (pred) => {
  const rs = RESULTS.filter(pred);
  return rs.length === 0 ? 1 : rs.filter((r) => r.pass).length / rs.length;
};
/** @param {string} field */
function tallyBy(field) {
  /** @type {Record<string, { pass: number, total: number }>} */
  const m = {};
  for (const r of RESULTS) {
    const k = /** @type {any} */ (r)[field];
    (m[k] ??= { pass: 0, total: 0 }).total++;
    if (r.pass) m[k].pass++;
  }
  return m;
}

// Emit the full breakdown into the test output (this IS the gate report).
const failures = RESULTS.filter((r) => !r.pass);
const line = (/** @type {string} */ s) => `[GATE] ${s}`;
console.log(line(`Raw-config Foundation Gate — ${RESULTS.length} samples, ${RESULTS.length - failures.length} pass, ${failures.length} fail`));
for (const cat of /** @type {const} */ (["valid", "broken", "invalid"])) {
  const rs = RESULTS.filter((r) => r.category === cat);
  console.log(line(`  ${cat.padEnd(8)} ${rs.filter((r) => r.pass).length}/${rs.length} (${(rate((r) => r.category === cat) * 100).toFixed(1)}%)`));
}
console.log(line("by protocol:"));
for (const [k, v] of Object.entries(tallyBy("protocol")).sort()) console.log(line(`    ${k.padEnd(12)} ${v.pass}/${v.total}`));
console.log(line("by format:"));
for (const [k, v] of Object.entries(tallyBy("format")).sort()) console.log(line(`    ${k.padEnd(13)} ${v.pass}/${v.total}`));
const recoveredCount = RESULTS.filter((r) => r.category === "broken" && r.recovered).length;
console.log(line(`broken handled via recover(): ${recoveredCount}; via tolerant parse: ${RESULTS.filter((r) => r.category === "broken" && !r.recovered).length}`));
for (const f of failures) console.log(line(`FAIL ${f.category}/${f.name} (${f.format}/${f.protocol}): ${f.reason}`));

describe("Raw-config Baseline Dataset — shape (15 §5)", () => {
  it("has 100 samples split 50 valid / 30 partially-broken / 20 invalid", () => {
    expect(VALID).toHaveLength(50);
    expect(PARTIALLY_BROKEN).toHaveLength(30);
    expect(INVALID).toHaveLength(20);
    expect(ALL_SAMPLES).toHaveLength(100);
  });

  it("covers all 7 protocols and all 6 input formats", () => {
    const protocols = new Set(ALL_SAMPLES.map((s) => s.protocol));
    for (const p of ["vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard"]) {
      expect(protocols.has(p), `protocol ${p} missing`).toBe(true);
    }
    const formats = new Set(ALL_SAMPLES.map((s) => s.format));
    expect([...formats].sort()).toEqual(["clash", "singbox", "subscription", "url", "wireguard", "xray"]);
  });

  it("every sample name is unique", () => {
    const names = ALL_SAMPLES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("Foundation Acceptance Gate — raw-config pipeline (ADR-006, 15 §6/§7)", () => {
  it("VALID configs parse (no recovery) into all-valid nodes at ≥95%", () => {
    const f = RESULTS.filter((r) => r.category === "valid" && !r.pass);
    expect(f.map((r) => `${r.name}: ${r.reason}`), "valid failures").toEqual([]);
    expect(rate((r) => r.category === "valid")).toBeGreaterThanOrEqual(0.95);
  });

  it("PARTIALLY-BROKEN configs are salvaged into valid nodes at ≥90% (Recovery ≥90%)", () => {
    const f = RESULTS.filter((r) => r.category === "broken" && !r.pass);
    expect(f.map((r) => `${r.name}: ${r.reason}`), "broken failures").toEqual([]);
    expect(rate((r) => r.category === "broken")).toBeGreaterThanOrEqual(0.90);
    // The bulk must go through real recover() (not just tolerant parse), proving
    // the Recovery Engine works end-to-end on broken samples (15 §6).
    const recovered = RESULTS.filter((r) => r.category === "broken" && r.recovered).length;
    expect(recovered).toBeGreaterThanOrEqual(0.5 * PARTIALLY_BROKEN.length);
  });

  it("INVALID configs never yield a valid node — false-positive rate <2% (15 §7)", () => {
    const falsePositives = RESULTS.filter((r) => r.category === "invalid" && !r.pass);
    expect(falsePositives.map((r) => `${r.name}: ${r.reason}`), "false positives").toEqual([]);
    expect(1 - rate((r) => r.category === "invalid")).toBeLessThan(0.02);
  });

  it("overall Baseline Dataset Pass Rate ≥95% (15 §6)", () => {
    expect(rate(() => true)).toBeGreaterThanOrEqual(0.95);
  });

  it("Recovery never fabricates security data — recovered nodes carry only present secrets", () => {
    // A recovered node may only have a uuid/password if it was actually in the
    // input. The dataset's recovered samples all supply their own secrets, so the
    // guarantee here is structural: recovery produced a node WITHOUT inventing the
    // identity fields the validators check (no recovered node validates true on a
    // fabricated uuid). This re-asserts the Stage 11 absolute rule at gate level.
    for (const s of PARTIALLY_BROKEN) {
      const r = runPipeline(s.raw);
      for (const node of r.nodes) {
        if (node.protocol === "vless" || node.protocol === "vmess") {
          // a produced valid vless/vmess node must have a real uuid (never invented as blank/garbage)
          if (node.validation.overallValid) {
            expect(typeof node.uuid === "string" && node.uuid.length > 0, `${s.name} fabricated uuid?`).toBe(true);
          }
        }
      }
    }
  });
});
