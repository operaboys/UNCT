/**
 * Config-level route rules extracted during parsing.
 * Stored per-node under `extensions.configRules` for Sing-box and Clash nodes.
 *
 * NOT part of the frozen UNMNode core (spec 05 §2). Lives in the `extensions`
 * escape hatch (spec 05 §8 "Core vs Runtime Extensions").
 *
 * Rule 9 (never fabricate): absent means the source format carries no route
 * rules block. Consumers must treat absent configRules as "not applicable",
 * not "no rules". Xray, URL, WireGuard, and subscription-derived nodes carry
 * no route rules → extensions.configRules is always absent for them.
 *
 * Clash and Sing-box both support route rules at the config level (one rule
 * table applies to the whole config). Because every node extracted from the
 * same config file shares the same rule table, configRules is stamped onto
 * EVERY node produced from that config — same as configDns (ADR-022).
 */

/**
 * Config-level route rules.
 *
 * Rules are stored as raw strings to avoid double-parsing:
 *  - Clash:    each string is the original rule line (e.g. "DOMAIN-SUFFIX,google.com,PROXY")
 *  - Sing-box: each string is JSON.stringify of the rule object (e.g. '{"domain":["g.co"],"outbound":"proxy"}')
 *
 * The analyzer (`core/analyzer/extended/rule-analyzer.js`) parses these
 * strings back when computing per-category counts; storing them raw here
 * keeps the extractor dumb and the analyzer independently testable.
 */
export interface ConfigRules {
  /** Which format produced this rule table — determines how rule strings should be read. */
  source: "clash" | "singbox";
  /** Raw rule strings (see above). Length === totalCount in the config. */
  rules: string[];
}
