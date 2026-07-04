/**
 * App Plugin Registry — the composition root that loads the project's real
 * Custom Parser plugins into one shared `PluginRegistry` instance, mirroring
 * `core/parser/parse-and-validate.js`'s `buildFactory()` pattern for the six
 * core parsers. Imported by both real parse entry points (`parse-and-
 * validate.js`'s main-thread path and `parser.worker.js`'s Worker path) so a
 * plugin loaded here is reachable from the real running app, not just from
 * a plugin's own unit test.
 *
 * `plugins/example-parser/` (explicitly EXAMPLE/TEST-ONLY per its own header)
 * is deliberately NOT loaded here — it targets a fictional format and must
 * never appear in the real app's parse path.
 */
import { createPluginRegistry } from "./registry.js";
import { createPluginLoader } from "./loader.js";
import { sip008Parser } from "../../plugins/sip008-parser/index.js";
import { hysteria2ConfigParser } from "../../plugins/hysteria2-config-parser/index.js";

function buildAppPluginRegistry() {
  const registry = createPluginRegistry();
  const loader = createPluginLoader(registry);
  loader.load({ id: "sip008-parser", type: "parser", implementation: sip008Parser });
  loader.load({ id: "hysteria2-config-parser", type: "parser", implementation: hysteria2ConfigParser });
  return registry;
}

/** Shared instance — one per JS realm (main thread, or one per Worker instance). */
export const appPluginRegistry = buildAppPluginRegistry();
