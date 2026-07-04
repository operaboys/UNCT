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
 *
 * Visual design (final visual design phase, Extractor step): restyled onto
 * the same Liquid Glass system as the other redesigned screens, reusing
 * `.glass-panel`/`.panel-title`/`.data-table`/`.table-scroll`/`.protocol-badge`/
 * `.plain-list`/`.hint`/`.mono` as-is — no new CSS was needed, this screen's
 * five tables + one placeholder fit the existing shapes exactly. No logic/
 * state/handlers changed — same selectors, same Worker/Reality bundle
 * lookups as before this pass.
 */
import { useMemo } from "preact/hooks";
import {
  selectNodesWithUuid,
  selectNodesWithIpAddress,
  selectNodesWithDomainAddress,
  selectNodesWithReality,
  selectAnalysisByNodeId,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { formatTriState, formatStringList } from "../analyzer/format.js";
import { PROTOCOL_ABBREVIATION } from "../components/protocol-labels.js";

export function ExtractorScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);

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
      <div class="screen-header">
        <h1 class="screen-title">{t("extractor.title")}</h1>
        <p class="screen-subtitle">
          {t("extractor.subtitle")}
        </p>
      </div>

      {nodes.length === 0 ? (
        <div class="panel glass-panel" aria-label={t("extractor.title")}>
          <p class="hint">{t("common.noNodesYet")}</p>
        </div>
      ) : (
        <>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.uuid.title")}>
            <div class="panel-title">{t("extractor.uuid.title")}</div>
            {uuidNodes.length === 0 ? (
              <p class="hint">{t("extractor.uuid.hint")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.uuid")}</th></tr>
                  </thead>
                  <tbody>
                    {uuidNodes.map((n) => (
                      <tr key={n.nodeId}>
                        <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                        <td class="mono">{n.address}</td>
                        <td class="mono"><bdi>{n.port}</bdi></td>
                        <td class="mono">{n.uuid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.ip.title")}>
            <div class="panel-title">{t("extractor.ip.title")}</div>
            {ipNodes.length === 0 ? (
              <p class="hint">{t("extractor.ip.hint")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th></tr>
                  </thead>
                  <tbody>
                    {ipNodes.map((n) => (
                      <tr key={n.nodeId}>
                        <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                        <td class="mono">{n.address}</td>
                        <td class="mono"><bdi>{n.port}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.domain.title")}>
            <div class="panel-title">{t("extractor.domain.title")}</div>
            {domainNodes.length === 0 ? (
              <p class="hint">{t("extractor.domain.hint")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th></tr>
                  </thead>
                  <tbody>
                    {domainNodes.map((n) => (
                      <tr key={n.nodeId}>
                        <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                        <td class="mono">{n.address}</td>
                        <td class="mono"><bdi>{n.port}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.worker.title")}>
            <div class="panel-title">{t("extractor.worker.title")}</div>
            {Object.keys(analysisByNodeId).length === 0 ? (
              <p class="hint">
                {t("extractor.worker.notAnalyzedHint")}
              </p>
            ) : workerNodes.length === 0 ? (
              <p class="hint">{t("extractor.worker.noneDetected")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.worker.domain")}</th>
                      <th>{t("common.worker.pathSegments")}</th><th>{t("common.worker.uuidSegment")}</th><th>{t("common.worker.parameters")}</th><th>{t("common.worker.encodedData")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerNodes.map((n) => {
                      const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId)!;
                      return (
                        <tr key={n.nodeId}>
                          <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                          <td class="mono">{n.address}</td>
                          <td class="mono"><bdi>{n.port}</bdi></td>
                          <td class="mono">{bundle.worker.workerDomain ?? "—"}</td>
                          <td>{formatStringList(bundle.worker.pathSegments)}</td>
                          <td class="mono">{bundle.worker.uuidSegment ?? "—"}</td>
                          <td>
                            {Object.keys(bundle.worker.parameters).length === 0
                              ? "—"
                              : Object.entries(bundle.worker.parameters)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join(", ")}
                          </td>
                          <td>
                            {bundle.worker.encodedDataFindings.length === 0 ? (
                              "—"
                            ) : (
                              <ul class="plain-list">
                                {bundle.worker.encodedDataFindings.map((f, i) => (
                                  <li key={i}>
                                    <strong>{f.source}</strong>:{" "}
                                    {f.rawBase64Detected ? `[binary] ${f.raw}` : f.decoded}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.reality.title")}>
            <div class="panel-title">{t("extractor.reality.title")}</div>
            {realityNodes.length === 0 ? (
              <p class="hint">{t("extractor.reality.hint")}</p>
            ) : (
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.reality.pbk")}</th><th>{t("common.reality.sid")}</th>
                      <th>{t("common.reality.pbkPlausible")}</th><th>{t("common.reality.sidPlausible")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realityNodes.map((n) => {
                      const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
                      return (
                        <tr key={n.nodeId}>
                          <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                          <td class="mono">{n.address}</td>
                          <td class="mono"><bdi>{n.port}</bdi></td>
                          <td class="mono">{n.pbk ?? ""}</td>
                          <td class="mono">{n.sid ?? ""}</td>
                          <td>{bundle ? formatTriState(bundle.reality.pbkPlausible) : t("extractor.reality.clickAnalyzeFirst")}</td>
                          <td>{bundle ? formatTriState(bundle.reality.sidPlausible) : t("extractor.reality.clickAnalyzeFirst")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("extractor.dns.title")} aria-disabled="true">
            <div class="panel-title">{t("extractor.dns.title")}</div>
            <p class="hint">
              {t("extractor.dns.hint")}
            </p>
          </div>
        </>
      )}
    </main>
  );
}
