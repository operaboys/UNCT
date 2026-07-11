/**
 * parseAndValidate(raw) — synchronous, same-thread "raw text -> UNMNode[]"
 * pipeline: parseWithFallback -> normalizeAll -> applyValidation (12-
 * PARSER_FACTORY §5 + the Validation Engine), the same chain the Foundation
 * Gate and `core/worker/parser.worker.js` already drive. Returns REAL,
 * nested `UNMNode` instances — never flattened, since there is no
 * postMessage boundary to cross on the main thread. `ui/converter/`'s
 * Converter Screen is this function's first caller, feeding its output
 * straight into `core/store/parser-state.js`, whose store + selectors
 * (`core/store/selectors.js`) expect the real nested shape, not
 * `parser.worker.js`'s flattened wire format (ADR-003 — that flatten step
 * is specifically for crossing a thread boundary, which does not apply
 * here).
 *
 * Registration order mirrors `core/worker/parser.worker.js`'s
 * `buildParserFactory()` (12-PARSER_FACTORY §5 fallback order) — kept as
 * its own short list here rather than a shared import, since the Worker
 * file is an already-frozen Phase 5 deliverable this step does not touch.
 *
 * Custom Parser plugins (`core/plugin/app-plugins.js`, Phase 11 Blocked-item
 * resolution) are a distinct, additive fallback tier tried only when the six
 * core parsers above all fail — see `core/plugin/parse-with-plugins.js`'s
 * header for why this does not touch `factory.js`'s own fallback chain.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import { createParserFactory, normalizeAll } from "./factory.js";
import { registerXrayParser } from "./xray/index.js";
import { registerSingBoxParser } from "./singbox/index.js";
import { registerClashParser } from "./clash/index.js";
import { registerUrlParser } from "./url/index.js";
import { registerSubscriptionParser } from "./subscription/index.js";
import { registerWireguardParser } from "./wireguard/index.js";
import { applyValidation } from "../validator/apply-validation.js";
import { withAlternativeCandidates } from "../unm/create-node.js";
import { appPluginRegistry } from "../plugin/app-plugins.js";
import { parseWithPlugins } from "../plugin/parse-with-plugins.js";

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
 * @param {string} raw
 * @returns {{ parserName: string, recovered: boolean, nodes: Readonly<UNMNode>[] }}
 * @throws {Error} if every core candidate AND every Custom Parser plugin
 *   fails, or none reaches the confidence threshold ("Unknown Format" — see
 *   ParserFactory.parseWithFallback)
 */
export function parseAndValidate(raw) {
  try {
    const { name, extraction, recovered, candidates } = factory.parseWithFallback(raw);
    const parser = factory.get(name);
    // Every candidate that reached the confidence threshold but was NOT the
    // selected parser (ADR-028) — `metadata.confidence` above stays exactly
    // the winner's own score, this is a separate, additive field.
    const alternativeCandidates = candidates.filter((c) => c.name !== name);
    const nodes = normalizeAll(parser, extraction)
      .map(applyValidation)
      .map((node) => withAlternativeCandidates(node, alternativeCandidates));
    return { parserName: name, recovered, nodes };
  } catch (coreError) {
    const pluginResult = parseWithPlugins(raw, appPluginRegistry);
    if (!pluginResult) throw coreError;
    return pluginResult;
  }
}
