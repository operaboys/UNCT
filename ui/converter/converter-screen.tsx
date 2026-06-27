/**
 * Converter Screen — the first real Phase 9 screen (07-UI_UX_SYSTEM §4.2),
 * built on `ui/store/`'s Preact bridge (ADR-015) over `core/store/`'s
 * Parser State, rather than calling `core/` directly the way `ui/main.tsx`'s
 * smoke proof did.
 *
 * Flow: Input Panel -> Parser Preview -> Normalized Object -> Output Panel
 * (doc 07 §4.2's diagram). Parsing/conversion are NOT duplicated here —
 * `handleParse` calls `core/parser/parse-and-validate.js#parseAndValidate`
 * (the same parse -> normalize -> applyValidation chain the Foundation Gate
 * and `parser.worker.js` already drive) and writes the result into
 * `parserStore`; everything this component renders is read back out through
 * `useParserState()` + Selectors (`core/store/selectors.js`) — Rule 11's
 * boundary: this file sorts/displays/aggregates values Core already
 * computed, it never scores or validates anything itself.
 *
 * Deliberately deferred past this first pass (doc 07 §4.2 lists them, none
 * block the Parser -> Validation -> Converter chain this screen exists to
 * prove): File Upload, Drag-Drop Zone, Clipboard Import (Input Panel — Paste
 * Area covers the same data path), and QR output (no QR library has been
 * reviewed under 14-DEPENDENCY_POLICY yet). Visual design (doc 07 §2's
 * Cyber Professional/Glassmorphism system) is also out of scope here —
 * structure and data flow only.
 */
import { useMemo, useState } from "preact/hooks";
import { parseAndValidate } from "../../core/parser/parse-and-validate.js";
import { convertBatch } from "../../core/converter/conversion.js";
import {
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
} from "../../core/store/selectors.js";
import { parserStore, useParserState } from "../store/use-parser-state.js";

type ExportFormat = "url" | "xrayJson" | "singboxJson" | "clashYaml";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  url: "Links (URL)",
  xrayJson: "Xray JSON",
  singboxJson: "Sing-box JSON",
  clashYaml: "Clash YAML",
};

interface LastParse {
  parserName: string;
  recovered: boolean;
}

export function ConverterScreen() {
  const nodes = useParserState();
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastParse, setLastParse] = useState<LastParse | null>(null);
  const [format, setFormat] = useState<ExportFormat>("url");

  const protocolCounts = useMemo(() => selectProtocolCounts({ nodes }), [nodes]);
  const warnings = useMemo(() => selectAggregatedWarnings({ nodes }), [nodes]);
  const errors = useMemo(() => selectAggregatedErrors({ nodes }), [nodes]);
  const recoveryActions = useMemo(() => selectAggregatedRecoveryActions({ nodes }), [nodes]);
  const { converted, skipped } = useMemo(() => convertBatch(nodes, format), [nodes, format]);

  function handleParse() {
    try {
      const result = parseAndValidate(raw);
      parserStore.setNodes(result.nodes);
      setLastParse({ parserName: result.parserName, recovered: result.recovered });
      setParseError(null);
    } catch (err) {
      parserStore.clearNodes();
      setLastParse(null);
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleClear() {
    setRaw("");
    setParseError(null);
    setLastParse(null);
    parserStore.clearNodes();
  }

  return (
    <main class="converter-screen">
      <h1>Converter</h1>

      <section aria-label="Input Panel">
        <h2>Input</h2>
        <p class="hint">
          Paste a config: a single URL (vless/vmess/trojan/ss/hysteria2/tuic), a multi-line
          subscription, Xray/Sing-box JSON, Clash/Clash.Meta YAML, or a WireGuard config. File
          Upload, Drag-Drop, and Clipboard Import are deferred past this first pass.
        </p>
        <textarea
          rows={8}
          cols={80}
          value={raw}
          onInput={(e) => setRaw((e.target as HTMLTextAreaElement).value)}
          placeholder="vless://... or a multi-line subscription, etc."
        />
        <div class="actions">
          <button type="button" onClick={handleParse} disabled={raw.trim().length === 0}>
            Parse
          </button>
          <button type="button" onClick={handleClear}>Clear</button>
        </div>
        {parseError && <p class="error" role="alert">{parseError}</p>}
      </section>

      <section aria-label="Parser Preview">
        <h2>Parser Preview</h2>
        {lastParse ? (
          <dl>
            <dt>Detected Format</dt>
            <dd>{lastParse.parserName}</dd>
            <dt>Recovered</dt>
            <dd>{String(lastParse.recovered)}</dd>
            <dt>Protocol Count</dt>
            <dd>
              {Object.keys(protocolCounts).length === 0
                ? "—"
                : Object.entries(protocolCounts).map(([p, c]) => `${p}: ${c}`).join(", ")}
            </dd>
            <dt>Errors</dt>
            <dd>{errors.length === 0 ? "none" : errors.join("; ")}</dd>
            <dt>Warnings</dt>
            <dd>{warnings.length === 0 ? "none" : warnings.join("; ")}</dd>
          </dl>
        ) : (
          <p class="hint">Parse an input above to see its preview.</p>
        )}
      </section>

      <section aria-label="Recovery Actions">
        <h2>Recovery Actions</h2>
        {recoveryActions.length === 0 ? (
          <p class="hint">No recovery actions were recorded.</p>
        ) : (
          <>
            <p>Recovered Fields Count: {recoveryActions.length}</p>
            <ul>
              {recoveryActions.map((action, i) => <li key={i}>{action}</li>)}
            </ul>
          </>
        )}
      </section>

      <section aria-label="Normalized Object">
        <h2>Normalized Object</h2>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Protocol</th><th>Address</th><th>Port</th>
                <th>Network</th><th>Security</th><th>Valid</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.nodeId}>
                  <td>{n.protocol}</td>
                  <td>{n.address}</td>
                  <td>{n.port}</td>
                  <td>{n.network}</td>
                  <td>{n.security}</td>
                  <td>{String(n.validation.overallValid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="Output Panel">
        <h2>Output</h2>
        <label>
          Format:{" "}
          <select
            value={format}
            onChange={(e) => setFormat((e.target as HTMLSelectElement).value as ExportFormat)}
          >
            {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </select>
        </label>
        <p class="hint">QR output is deferred — no QR library has been reviewed under 14-DEPENDENCY_POLICY yet.</p>
        {nodes.length === 0 ? (
          <p class="hint">Nothing to export yet.</p>
        ) : (
          <>
            <textarea readOnly rows={10} cols={80} value={converted.map((c) => c.output).join("\n")} />
            {skipped.length > 0 && (
              <p class="hint">
                Skipped ({skipped.length}, protocol not supported by this format):{" "}
                {skipped.map((s) => s.protocol).join(", ")}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
