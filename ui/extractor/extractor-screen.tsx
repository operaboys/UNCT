/**
 * Extractor Screen (07-UI_UX_SYSTEM §4.5) — the fifth real Phase 9 screen.
 * Doc 07 §4.5 lists six extractors: "UUID, IP, Domain, Worker*, Reality, DNS
 * Extractor" — only Worker carries the doc's own footnote ("Worker Extractor
 * به فاز نیمه‌قطعی Analyzer وابسته است"). DNS is NOT footnoted there, but
 * `core/analyzer/analyze-node.js`'s own doc comment groups `dnsLeakRisk` in
 * the exact same not-yet-built bucket as `workerDetected`/`cloudflareDetected`
 * (06-ANALYZER_ENGINE's semi-definitive modules, Phase 10) — so DNS Extractor
 * gets the identical disabled-placeholder treatment as Worker, not silent
 * omission.
 *
 * UUID/IP/Domain Extractor are built on three new field-shape selectors
 * (`selectNodesWithUuid`/`selectNodesWithIpAddress`/`selectNodesWithDomainAddress`,
 * core/store/selectors.js) — Rule 11's boundary: these only classify an
 * already-set field's presence/shape, they compute no new score or validity.
 *
 * Reality Extractor composes two ALREADY-real sources: the raw `pbk`/`sid`
 * UNM fields (`selectNodesWithReality`) and the Phase-6-frozen Reality
 * Analyzer verdict (`reality.pbkPlausible`/`sidPlausible`, looked up the same
 * way `analyzer-screen.tsx`'s "Reality Analysis" section does via
 * `useAnalyzerState()`/`selectAnalysisByNodeId`). This is narrower than doc
 * 03-FEATURE_MATRIX §3's "Extract Reality Keys", which that document itself
 * classifies under "Advanced Extraction — نیمه‌قطعی" (semi-definitive,
 * Phase 10) — this screen does not attempt that deeper feature, only the
 * legitimately-already-real field/verdict lookup (Rule 9: never fabricate).
 */
import { useMemo } from "preact/hooks";
import {
  selectNodesWithUuid,
  selectNodesWithIpAddress,
  selectNodesWithDomainAddress,
  selectNodesWithReality,
  selectAnalysisByNodeId,
} from "../../core/store/selectors.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { formatTriState } from "../analyzer/format.js";

export function ExtractorScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();

  const uuidNodes = useMemo(() => selectNodesWithUuid({ nodes }), [nodes]);
  const ipNodes = useMemo(() => selectNodesWithIpAddress({ nodes }), [nodes]);
  const domainNodes = useMemo(() => selectNodesWithDomainAddress({ nodes }), [nodes]);
  const realityNodes = useMemo(() => selectNodesWithReality({ nodes }), [nodes]);

  return (
    <main class="extractor-screen">
      <h1>Extractor</h1>

      {nodes.length === 0 ? (
        <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
      ) : (
        <>
          <section aria-label="UUID Extractor">
            <h2>UUID Extractor</h2>
            {uuidNodes.length === 0 ? (
              <p class="hint">No nodes carry a uuid.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Protocol</th><th>Address</th><th>Port</th><th>UUID</th></tr>
                </thead>
                <tbody>
                  {uuidNodes.map((n) => (
                    <tr key={n.nodeId}>
                      <td>{n.protocol}</td><td>{n.address}</td><td>{n.port}</td><td>{n.uuid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="IP Extractor">
            <h2>IP Extractor</h2>
            {ipNodes.length === 0 ? (
              <p class="hint">No nodes have a literal IP address.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Protocol</th><th>Address</th><th>Port</th></tr>
                </thead>
                <tbody>
                  {ipNodes.map((n) => (
                    <tr key={n.nodeId}><td>{n.protocol}</td><td>{n.address}</td><td>{n.port}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Domain Extractor">
            <h2>Domain Extractor</h2>
            {domainNodes.length === 0 ? (
              <p class="hint">No nodes have a domain address.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Protocol</th><th>Address</th><th>Port</th></tr>
                </thead>
                <tbody>
                  {domainNodes.map((n) => (
                    <tr key={n.nodeId}><td>{n.protocol}</td><td>{n.address}</td><td>{n.port}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Worker Extractor" aria-disabled="true">
            <h2>Worker Extractor</h2>
            <p class="hint">
              Deferred — per doc 07 §4.5's footnote, Worker Extractor depends on the
              Analyzer's semi-definitive `workerDetected` module (06-ANALYZER_ENGINE,
              Phase 10) and is shown as a placeholder until that module exists.
            </p>
          </section>

          <section aria-label="Reality Extractor">
            <h2>Reality Extractor</h2>
            {realityNodes.length === 0 ? (
              <p class="hint">No nodes use Reality.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Protocol</th><th>Address</th><th>Port</th><th>PBK</th><th>SID</th>
                    <th>PBK Plausible</th><th>SID Plausible</th>
                  </tr>
                </thead>
                <tbody>
                  {realityNodes.map((n) => {
                    const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
                    return (
                      <tr key={n.nodeId}>
                        <td>{n.protocol}</td>
                        <td>{n.address}</td>
                        <td>{n.port}</td>
                        <td>{n.pbk ?? ""}</td>
                        <td>{n.sid ?? ""}</td>
                        <td>{bundle ? formatTriState(bundle.reality.pbkPlausible) : "Click Analyze first"}</td>
                        <td>{bundle ? formatTriState(bundle.reality.sidPlausible) : "Click Analyze first"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="DNS Extractor" aria-disabled="true">
            <h2>DNS Extractor</h2>
            <p class="hint">
              Deferred — `dnsLeakRisk` (core/analyzer/analyze-node.js) is grouped with
              `workerDetected` among the semi-definitive Phase 10 modules
              (06-ANALYZER_ENGINE), so DNS Extractor is shown as a placeholder until
              that module exists, the same as Worker Extractor above.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
