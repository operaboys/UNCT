/**
 * Extractor Screen (07-UI_UX_SYSTEM §4.5) — the fifth real Phase 9 screen.
 * Doc 07 §4.5 lists six extractors: "UUID, IP, Domain, Worker, Reality, DNS
 * Extractor".
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
 *
 * Worker Extractor (un-deferred — Orphan Check finding): `analyze-node.js`
 * already threads `analyzeWorker` into every `AnalysisBundle` (the `worker`
 * field), the same way Compatibility/Cloudflare/Clean-IP were wired in
 * earlier — there was no missing Core logic, only a stale disabled
 * placeholder left over from before that wiring existed. Unlike Reality,
 * Worker detection has no raw UNM field to key off of (a Worker URL is
 * itself an ordinary vless/vmess/trojan node whose address/path merely LOOK
 * like a Cloudflare Worker) — so, unlike the other four extractors here,
 * this one has NOTHING to show until the Analyzer has actually run
 * (Rule 9: never guess "this might be a Worker" from an unanalyzed node).
 *
 * DNS Extractor stays deferred/disabled — deliberately NOT touched here.
 * Per ADR-022, `core/analyzer/extended/dns-analyzer.js` exists but is not
 * yet wired into `AnalysisBundle` at all (a different, not-yet-finished
 * situation from Worker's, which only lacked its UI layer) — a separate
 * review decides when that module's own architecture is ready.
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
import { formatTriState, formatStringList } from "../analyzer/format.js";

export function ExtractorScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();

  const uuidNodes = useMemo(() => selectNodesWithUuid({ nodes }), [nodes]);
  const ipNodes = useMemo(() => selectNodesWithIpAddress({ nodes }), [nodes]);
  const domainNodes = useMemo(() => selectNodesWithDomainAddress({ nodes }), [nodes]);
  const realityNodes = useMemo(() => selectNodesWithReality({ nodes }), [nodes]);
  const workerNodes = useMemo(
    () => nodes.filter((n) => selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId)?.worker.applicable === true),
    [nodes, analysisByNodeId],
  );

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

          <section aria-label="Worker Extractor">
            <h2>Worker Extractor</h2>
            {Object.keys(analysisByNodeId).length === 0 ? (
              <p class="hint">
                No nodes analyzed yet — visit the Analyzer Screen first. Worker detection is an
                Analyzer verdict, not a raw field (Rule 9: never guess from an unanalyzed node).
              </p>
            ) : workerNodes.length === 0 ? (
              <p class="hint">No analyzed nodes were detected as Cloudflare Workers.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Protocol</th><th>Address</th><th>Port</th><th>Worker Domain</th>
                    <th>Path Segments</th><th>UUID Segment</th><th>Parameters</th><th>Encoded Data</th>
                  </tr>
                </thead>
                <tbody>
                  {workerNodes.map((n) => {
                    const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId)!;
                    return (
                      <tr key={n.nodeId}>
                        <td>{n.protocol}</td>
                        <td>{n.address}</td>
                        <td>{n.port}</td>
                        <td>{bundle.worker.workerDomain ?? "—"}</td>
                        <td>{formatStringList(bundle.worker.pathSegments)}</td>
                        <td>{bundle.worker.uuidSegment ?? "—"}</td>
                        <td>
                          {Object.keys(bundle.worker.parameters).length === 0
                            ? "—"
                            : Object.entries(bundle.worker.parameters)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(", ")}
                        </td>
                        <td>
                          {bundle.worker.encodedDataFindings.length === 0
                            ? "—"
                            : bundle.worker.encodedDataFindings.map((f, i) => (
                                <div key={i}>
                                  <strong>{f.source}</strong>:{" "}
                                  {f.rawBase64Detected ? `[binary] ${f.raw}` : f.decoded}
                                </div>
                              ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
