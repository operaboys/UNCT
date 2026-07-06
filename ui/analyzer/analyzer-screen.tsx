/**
 * Analyzer Screen (07-UI_UX_SYSTEM §4.3) — the second real Phase 9 screen,
 * built the same way the Converter Screen was: `ui/store/`'s Preact bridge
 * (ADR-015) over a `core/store/` domain, real-Worker-routed Core logic
 * (ADR-016's pattern reused, not re-derived — see `analyzer-worker-client.ts`).
 *
 * Reads its input nodes from the SAME app-wide `parserStore` the Converter
 * Screen writes into via Parse — this is the "Import → Analyze" half of
 * Phase 9's exit condition (09-DEVELOPMENT_ROADMAP), not a separate/parallel
 * node collection. `handleAnalyze` calls `analyzer-worker-client.js#analyzeNodes`
 * for every currently-parsed node and writes the six-module verdict bundle
 * into the sibling `analyzerStore` (`core/store/analyzer-state.js`) — kept
 * separate from `node.analysis` for the reason documented there: today's
 * Analyzer Engine can only fill one real `AnalysisObject` field
 * (`securityScore`), so the raw bundle must not be fabricated into that
 * frozen shape (Rule 9).
 *
 * Section mapping from doc 07 §4.3's list onto the six Core analyzer modules
 * (`core/analyzer/types.d.ts`): Node Details = node fields + Completeness;
 * Protocol Analysis = ProtocolAnalysis; Security Analysis = Security +
 * TLS (doc 07 has no separate TLS section — TLS coherence is a security-
 * quality concern); Compatibility Analysis = NetworkAnalysis; Cloudflare
 * Analysis* = disabled placeholder (semi-definitive Phase 10 module, per
 * doc 07 §4.3's own footnote); Reality Analysis = RealityAnalysis.
 *
 * "Platform & Client Compatibility" (below, last section) is the seventh,
 * Phase 10 Extended module (06-ANALYZER_ENGINE §2.6, `CompatibilityAnalysis`)
 * — a NEW section, not a placeholder activation, since none existed for it.
 * Deliberately named apart from "Compatibility Analysis" above: that section
 * is the NetworkAnalysis module judging transport-vs-protocol compatibility;
 * this one judges whether real client apps/platforms can use the node at
 * all, an unrelated question that happens to share the word "Compatibility".
 *
 * Visual design (final visual design phase, Analyzer step): restyled onto
 * the same Liquid Glass system as Dashboard/Converter, reusing their exact
 * classes (`.glass-panel`, `.panel-title`, `.kv-list`/`.kv-row`, `.btn`,
 * `.select`, `.alert`, `.data-table`, `.hint`) rather than inventing new
 * ones. The one new class this step adds, `.panel-grid` (a symmetric
 * wrapping grid, in `assets/css/theme.css`), exists because this screen's
 * nine analysis sections are equal-weight cards — a different shape from
 * Dashboard's asymmetric master-detail `.content-grid`, not a duplicate of
 * it. No logic/state/handlers changed here — same `handleAnalyze`, same
 * selectors, same six-module bundle read-out as before this pass.
 *
 * P12-14 addition (`riskScore`/`compatibilityScore`, ADR-027, this
 * checkpoint): `riskScore` is added as a new row directly under
 * `securityScore` in "Security Analysis" (the two numbers are read together
 * most naturally); `compatibilityScore` is added as a new row above the
 * existing Platform/Client tables in "Platform & Client Compatibility" — it
 * is the numeric summary of exactly that section's own data. Both are
 * per-node numbers (like `securityScore`), so they belong here, not on the
 * Dashboard (whose only score aggregate, `selectAverageSecurityScore`, is a
 * cross-node average — a different kind of number, out of this checkpoint's
 * scope). See `core/analyzer/risk-score.js` for the formulas.
 */
import { useMemo, useState } from "preact/hooks";
import { selectAnalysisByNodeId } from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { analyzerStore, useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { analyzeNodes, CancelledError, AnalyzeTimeoutError } from "../store/analyzer-worker-client.js";
import { formatStringList, formatTriState, formatScore, formatBadge } from "./format.js";

export function AnalyzerScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const effectiveSelectedNodeId = useMemo(() => {
    if (selectedNodeId && nodes.some((n) => n.nodeId === selectedNodeId)) return selectedNodeId;
    return nodes[0]?.nodeId ?? null;
  }, [selectedNodeId, nodes]);

  const selectedNode = nodes.find((n) => n.nodeId === effectiveSelectedNodeId);
  const bundle = selectedNode
    ? selectAnalysisByNodeId({ analysisByNodeId }, selectedNode.nodeId)
    : undefined;

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const result = await analyzeNodes(nodes);
      analyzerStore.setAnalysisBatch(result.analyzed);
      setAnalyzeError(null);
    } catch (err) {
      // A superseded job resolves itself instead — never surface a stale
      // cancellation as a user error (10-PERFORMANCE_ENGINE §6.1).
      if (err instanceof CancelledError) return;
      // The 30s Job timeout safety-net (analyzer-worker-client.ts) — a real,
      // clear message instead of the raw Error, regardless of whatever
      // caused the Job to never settle.
      if (err instanceof AnalyzeTimeoutError) {
        setAnalyzeError(t("analyzer.error.timeout"));
        return;
      }
      setAnalyzeError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main class="analyzer-screen">
      <div class="screen-header">
        <h1 class="screen-title">{t("analyzer.title")}</h1>
        <p class="screen-subtitle">
          {t("analyzer.subtitle")}
        </p>
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("analyzer.controls.ariaLabel")}>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : (
          <>
            <div class="form-actions" style={{ marginBlockStart: 0 }}>
              <select
                class="select"
                value={effectiveSelectedNodeId ?? ""}
                onChange={(e) => setSelectedNodeId((e.target as HTMLSelectElement).value)}
              >
                {nodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>
                    {n.protocol} — {n.address}:{n.port}
                  </option>
                ))}
              </select>
              <button type="button" class="btn btn--primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? t("analyzer.actions.analyzing") : t("analyzer.actions.analyze")}
              </button>
            </div>
            {analyzeError && <div class="alert alert--error" role="alert">{analyzeError}</div>}
            {selectedNode && !bundle && (
              <p class="hint" style={{ marginBlockStart: "12px" }}>{t("analyzer.hint.clickAnalyze")}</p>
            )}
          </>
        )}
      </div>

      {selectedNode && bundle && (
        <div class="panel-grid">
          <div class="panel glass-panel" aria-label={t("analyzer.nodeDetails.title")}>
            <div class="panel-title">{t("analyzer.nodeDetails.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("common.fields.protocol")}</dt><dd>{selectedNode.protocol}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.address")}</dt><dd class="mono">{selectedNode.address}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.port")}</dt><dd class="mono"><bdi>{selectedNode.port}</bdi></dd></div>
              <div class="kv-row"><dt>{t("common.fields.network")}</dt><dd>{selectedNode.network}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.security")}</dt><dd>{selectedNode.security}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.nodeDetails.completenessScore")}</dt><dd>{formatScore(bundle.completeness.completenessScore)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.nodeDetails.presentOptionalFields")}</dt><dd>{formatStringList(bundle.completeness.presentOptionalFields)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.nodeDetails.missingFields")}</dt><dd>{formatStringList(bundle.completeness.missingFields)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.protocolAnalysis.title")}>
            <div class="panel-title">{t("analyzer.protocolAnalysis.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("common.fields.protocol")}</dt><dd>{bundle.protocol.protocol}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.protocolAnalysis.recognized")}</dt><dd>{formatTriState(bundle.protocol.recognized)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.securityAnalysis.title")}>
            <div class="panel-title">{t("analyzer.securityAnalysis.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.securityScore")}</dt><dd>{formatScore(bundle.security.securityScore)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.riskScore")}</dt><dd>{formatScore(bundle.riskScore)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.fields.issues")}</dt><dd>{formatStringList(bundle.security.issues)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.tlsApplicable")}</dt><dd>{formatTriState(bundle.tls.applicable)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.tlsCoherent")}</dt><dd>{formatTriState(bundle.tls.coherent)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.knownFingerprint")}</dt><dd>{formatTriState(bundle.tls.knownFingerprint)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.securityAnalysis.tlsIssues")}</dt><dd>{formatStringList(bundle.tls.issues)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.compatibilityAnalysis.title")}>
            <div class="panel-title">{t("analyzer.compatibilityAnalysis.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("common.fields.network")}</dt><dd>{bundle.network.network}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.compatible")}</dt><dd>{formatTriState(bundle.network.compatible)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.compatibilityAnalysis.supportedNetworks")}</dt><dd>{formatStringList(bundle.network.supportedNetworks)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.cloudflareAnalysis.title")}>
            <div class="panel-title">{t("analyzer.cloudflareAnalysis.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("analyzer.cloudflareAnalysis.likelyWorker")}</dt><dd>{formatTriState(bundle.cloudflare.likelyCloudflareWorker)}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.confidence")}</dt><dd><bdi>{bundle.cloudflare.confidence}</bdi></dd></div>
              <div class="kv-row"><dt>{t("common.fields.signals")}</dt><dd>{formatStringList(bundle.cloudflare.signals)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.cleanIp.title")}>
            <div class="panel-title">{t("analyzer.cleanIp.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("analyzer.cleanIp.pattern")}</dt><dd>{formatTriState(bundle.cleanIp.isCleanIpPattern)}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.confidence")}</dt><dd><bdi>{bundle.cleanIp.confidence}</bdi></dd></div>
              <div class="kv-row"><dt>{t("common.fields.signals")}</dt><dd>{formatStringList(bundle.cleanIp.signals)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.worker.title")}>
            <div class="panel-title">{t("analyzer.worker.title")}</div>
            {bundle.worker.applicable ? (
              <dl class="kv-list">
                <div class="kv-row"><dt>{t("common.worker.domain")}</dt><dd class="mono">{bundle.worker.workerDomain ?? "—"}</dd></div>
                <div class="kv-row"><dt>{t("common.worker.pathSegments")}</dt><dd>{formatStringList(bundle.worker.pathSegments)}</dd></div>
                <div class="kv-row"><dt>{t("common.worker.uuidSegment")}</dt><dd class="mono">{bundle.worker.uuidSegment ?? "—"}</dd></div>
                <div class="kv-row">
                  <dt>{t("common.worker.parameters")}</dt>
                  <dd>
                    {Object.keys(bundle.worker.parameters).length === 0
                      ? "—"
                      : Object.entries(bundle.worker.parameters)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(", ")}
                  </dd>
                </div>
                {bundle.worker.encodedDataFindings.length > 0 && (
                  <div class="kv-row">
                    <dt>{t("common.worker.encodedData")}</dt>
                    <dd>
                      <ul class="plain-list">
                        {bundle.worker.encodedDataFindings.map((f, i) => (
                          <li key={i}>
                            <strong>{f.source}</strong>:{" "}
                            {f.rawBase64Detected ? `[binary] ${f.raw}` : f.decoded}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p class="hint">{t("analyzer.worker.notDetected")}</p>
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.realityAnalysis.title")}>
            <div class="panel-title">{t("analyzer.realityAnalysis.title")}</div>
            <dl class="kv-list">
              <div class="kv-row"><dt>{t("analyzer.realityAnalysis.applicable")}</dt><dd>{formatTriState(bundle.reality.applicable)}</dd></div>
              <div class="kv-row"><dt>{t("common.fields.compatible")}</dt><dd>{formatTriState(bundle.reality.compatible)}</dd></div>
              <div class="kv-row"><dt>{t("common.reality.pbkPlausible")}</dt><dd>{formatTriState(bundle.reality.pbkPlausible)}</dd></div>
              <div class="kv-row"><dt>{t("common.reality.sidPlausible")}</dt><dd>{formatTriState(bundle.reality.sidPlausible)}</dd></div>
              <div class="kv-row"><dt>{t("analyzer.fields.issues")}</dt><dd>{formatStringList(bundle.reality.issues)}</dd></div>
            </dl>
          </div>

          <div class="panel glass-panel" aria-label={t("analyzer.rules.title")}>
            <div class="panel-title">{t("analyzer.rules.title")}</div>
            {!bundle.rules.applicable ? (
              <p class="hint">{t("analyzer.rules.notApplicable")}</p>
            ) : (
              <dl class="kv-list">
                <div class="kv-row"><dt>{t("analyzer.rules.totalRules")}</dt><dd><bdi>{bundle.rules.totalCount}</bdi></dd></div>
                <div class="kv-row">
                  <dt>{t("analyzer.rules.byCategory")}</dt>
                  <dd>
                    {Object.entries(bundle.rules.byCategory).length === 0
                      ? "—"
                      : Object.entries(bundle.rules.byCategory)
                          .map(([cat, count]) => `${cat}: ${count}`)
                          .join(", ")}
                  </dd>
                </div>
                <div class="kv-row"><dt>{t("analyzer.rules.duplicateRules")}</dt><dd><bdi>{bundle.rules.duplicateCount}</bdi></dd></div>
                {bundle.rules.duplicates.length > 0 && (
                  <div class="kv-row">
                    <dt>{t("analyzer.rules.duplicateEntries")}</dt>
                    <dd>
                      <ul class="plain-list">
                        {bundle.rules.duplicates.map((d) => <li key={d} class="mono">{d}</li>)}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      )}

      {selectedNode && bundle && (
        <div class="panel glass-panel" style={{ marginBlockStart: "20px" }} aria-label={t("analyzer.compatibility.title")}>
          <div class="panel-title">{t("analyzer.compatibility.title")}</div>
          <dl class="kv-list" style={{ marginBlockEnd: "14px" }}>
            <div class="kv-row"><dt>{t("analyzer.compatibility.compatibilityScore")}</dt><dd>{formatScore(bundle.compatibilityScore)}</dd></div>
          </dl>
          <div class="table-scroll">
            <table class="data-table data-table--center" aria-label={t("analyzer.compatibility.platformsCaption")}>
              <caption class="hint" style={{ textAlign: "start", marginBlockEnd: "8px" }}>{t("analyzer.compatibility.platformsCaption")}</caption>
              <thead>
                <tr>
                  <th>{t("analyzer.compatibility.platform.android")}</th><th>{t("analyzer.compatibility.platform.ios")}</th><th>{t("analyzer.compatibility.platform.windows")}</th><th>{t("analyzer.compatibility.platform.linux")}</th><th>{t("analyzer.compatibility.platform.macos")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatBadge(bundle.compatibility.platforms.android)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.ios)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.windows)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.linux)}</td>
                  <td>{formatBadge(bundle.compatibility.platforms.macos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-scroll" style={{ marginBlockStart: "20px" }}>
            <table class="data-table data-table--center" aria-label={t("analyzer.compatibility.clientsCaption")}>
              <caption class="hint" style={{ textAlign: "start", marginBlockEnd: "8px" }}>{t("analyzer.compatibility.clientsCaption")}</caption>
              <thead>
                <tr>
                  <th>{t("analyzer.compatibility.client.xray")}</th><th>{t("analyzer.compatibility.client.singbox")}</th><th>{t("analyzer.compatibility.client.clashMeta")}</th><th>{t("analyzer.compatibility.client.nekobox")}</th><th>{t("analyzer.compatibility.client.v2rayng")}</th><th>{t("analyzer.compatibility.client.hiddify")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatBadge(bundle.compatibility.clients.xray)}</td>
                  <td>{formatBadge(bundle.compatibility.clients["sing-box"])}</td>
                  <td>{formatBadge(bundle.compatibility.clients["clash-meta"])}</td>
                  <td>{formatBadge(bundle.compatibility.clients.nekobox)}</td>
                  <td>{formatBadge(bundle.compatibility.clients.v2rayng)}</td>
                  <td>{formatBadge(bundle.compatibility.clients.hiddify)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
