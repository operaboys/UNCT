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
 * DNS Extractor (un-deferred, same shape as Worker's un-deferral):
 * `analyze-node.js` now threads `analyzeDnsLeakRisk` (ADR-022) into every
 * `AnalysisBundle` as its own independent `dns` field — never folded into
 * `security` (ADR-011 §"Explicitly out of scope" forbids exactly that; the
 * eventual `riskScore` aggregate combining Security + Compatibility + DNS +
 * Reality is a separate, still-open Final Report decision, not this
 * screen's or this field's concern). Every node gets a real
 * `dnsLeakRisk` verdict once Analyzed (including "unknown" for URL/
 * subscription-sourced nodes that structurally carry no DNS block — Rule 9,
 * shown as its own neutral badge, never silently hidden or defaulted to
 * "none"), rendered as a `.tag` badge colored by `dnsRiskTagClass()`
 * (`ui/analyzer/format.ts`) the same way Developer Console colors severity.
 * Per-row "Click Analyze first" fallback for any node without a bundle yet
 * mirrors the Reality Extractor's own per-row (not whole-panel) gate above,
 * since DNS risk is meaningful for every node rather than a subset like
 * Worker's.
 *
 * Visual design (final visual design phase, Extractor step): restyled onto
 * the same Liquid Glass system as the other redesigned screens, reusing
 * `.glass-panel`/`.panel-title`/`.data-table`/`.table-scroll`/`.protocol-badge`/
 * `.plain-list`/`.hint`/`.mono`/`.tag` as-is — no new CSS was needed. No
 * logic/state/handlers changed for the other five sections — same
 * selectors, same Worker/Reality bundle lookups as before this pass.
 *
 * P12-12 addition (Extractor Level System, 4 new panels — this checkpoint):
 * Credentials/Transport/TLS-Fingerprint/Flow Extractor. Each is the exact
 * same Rule 11 field-shape-classification pattern as UUID/IP/Domain above —
 * a new `core/store/selectors.js` selector, no new Core logic. Brings the
 * real Extractor count from 6 to 10 (grep-verified against
 * `docs/blueprints/ULTIMATE_BLUEPRINT_INDEX.md` P12-12's addendum), meeting
 * the 8-10 threshold that had kept this item Blocked.
 *
 * Virtualization (2026-07-05): at real-world scale (~3000 nodes) every one
 * of this screen's 10 panels rendered its full array with a plain `.map()`
 * inside an unbounded `.table-scroll` — the same pattern already fixed in
 * Developer Console/Export Center, missed here in that pass. All 10 now use
 * the shared `VirtualTable` (`ui/components/virtual-table.tsx`), giving each
 * panel its own bounded scroll container instead of growing the whole page.
 */
import { useMemo } from "preact/hooks";
import {
  selectNodesWithUuid,
  selectNodesWithIpAddress,
  selectNodesWithDomainAddress,
  selectNodesWithReality,
  selectNodesWithCredentials,
  selectNodesWithTransportPath,
  selectNodesWithTlsFingerprint,
  selectNodesWithFlow,
  selectAnalysisByNodeId,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { formatTriState, formatStringList, dnsRiskTagClass } from "../analyzer/format.js";
import { PROTOCOL_ABBREVIATION } from "../components/protocol-labels.js";
import { VirtualTable } from "../components/virtual-table.js";

export function ExtractorScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);

  const uuidNodes = useMemo(() => selectNodesWithUuid({ nodes }), [nodes]);
  const ipNodes = useMemo(() => selectNodesWithIpAddress({ nodes }), [nodes]);
  const domainNodes = useMemo(() => selectNodesWithDomainAddress({ nodes }), [nodes]);
  const realityNodes = useMemo(() => selectNodesWithReality({ nodes }), [nodes]);
  const credentialsNodes = useMemo(() => selectNodesWithCredentials({ nodes }), [nodes]);
  const transportNodes = useMemo(() => selectNodesWithTransportPath({ nodes }), [nodes]);
  const tlsFingerprintNodes = useMemo(() => selectNodesWithTlsFingerprint({ nodes }), [nodes]);
  const flowNodes = useMemo(() => selectNodesWithFlow({ nodes }), [nodes]);
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
              <VirtualTable
                items={uuidNodes}
                columnCount={4}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.uuid")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td class="mono">{n.uuid}</td>
                  </>
                )}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.ip.title")}>
            <div class="panel-title">{t("extractor.ip.title")}</div>
            {ipNodes.length === 0 ? (
              <p class="hint">{t("extractor.ip.hint")}</p>
            ) : (
              <VirtualTable
                items={ipNodes}
                columnCount={3}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                  </>
                )}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.domain.title")}>
            <div class="panel-title">{t("extractor.domain.title")}</div>
            {domainNodes.length === 0 ? (
              <p class="hint">{t("extractor.domain.hint")}</p>
            ) : (
              <VirtualTable
                items={domainNodes}
                columnCount={3}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                  </>
                )}
              />
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
              <VirtualTable
                items={workerNodes}
                columnCount={8}
                header={(
                  <tr>
                    <th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.worker.domain")}</th>
                    <th>{t("common.worker.pathSegments")}</th><th>{t("common.worker.uuidSegment")}</th><th>{t("common.worker.parameters")}</th><th>{t("common.worker.encodedData")}</th>
                  </tr>
                )}
                renderRow={(n) => {
                  const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId)!;
                  return (
                    <>
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
                    </>
                  );
                }}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.reality.title")}>
            <div class="panel-title">{t("extractor.reality.title")}</div>
            {realityNodes.length === 0 ? (
              <p class="hint">{t("extractor.reality.hint")}</p>
            ) : (
              <VirtualTable
                items={realityNodes}
                columnCount={7}
                header={(
                  <tr>
                    <th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.reality.pbk")}</th><th>{t("common.reality.sid")}</th>
                    <th>{t("common.reality.pbkPlausible")}</th><th>{t("common.reality.sidPlausible")}</th>
                  </tr>
                )}
                renderRow={(n) => {
                  const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
                  return (
                    <>
                      <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                      <td class="mono">{n.address}</td>
                      <td class="mono"><bdi>{n.port}</bdi></td>
                      <td class="mono">{n.pbk ?? ""}</td>
                      <td class="mono">{n.sid ?? ""}</td>
                      <td>{bundle ? formatTriState(bundle.reality.pbkPlausible) : t("extractor.reality.clickAnalyzeFirst")}</td>
                      <td>{bundle ? formatTriState(bundle.reality.sidPlausible) : t("extractor.reality.clickAnalyzeFirst")}</td>
                    </>
                  );
                }}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.dns.title")}>
            <div class="panel-title">{t("extractor.dns.title")}</div>
            <VirtualTable
              items={nodes}
              columnCount={4}
              header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.dnsLeakRisk")}</th></tr>}
              renderRow={(n) => {
                const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
                return (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td>
                      {bundle ? (
                        <span class={`tag ${dnsRiskTagClass(bundle.dns)}`}>{t(`extractor.dns.risk.${bundle.dns}`)}</span>
                      ) : (
                        t("extractor.reality.clickAnalyzeFirst")
                      )}
                    </td>
                  </>
                );
              }}
            />
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.credentials.title")}>
            <div class="panel-title">{t("extractor.credentials.title")}</div>
            {credentialsNodes.length === 0 ? (
              <p class="hint">{t("extractor.credentials.hint")}</p>
            ) : (
              <VirtualTable
                items={credentialsNodes}
                columnCount={5}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.method")}</th><th>{t("common.fields.password")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td class="mono">{n.method ?? "—"}</td>
                    <td class="mono">{n.password ?? "—"}</td>
                  </>
                )}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.transport.title")}>
            <div class="panel-title">{t("extractor.transport.title")}</div>
            {transportNodes.length === 0 ? (
              <p class="hint">{t("extractor.transport.hint")}</p>
            ) : (
              <VirtualTable
                items={transportNodes}
                columnCount={6}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.network")}</th><th>{t("common.fields.host")}</th><th>{t("common.fields.path")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td class="mono">{n.network}</td>
                    <td class="mono">{n.host ?? "—"}</td>
                    <td class="mono">{n.path ?? "—"}</td>
                  </>
                )}
              />
            )}
          </div>

          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("extractor.tls.title")}>
            <div class="panel-title">{t("extractor.tls.title")}</div>
            {tlsFingerprintNodes.length === 0 ? (
              <p class="hint">{t("extractor.tls.hint")}</p>
            ) : (
              <VirtualTable
                items={tlsFingerprintNodes}
                columnCount={5}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.alpn")}</th><th>{t("common.fields.fingerprint")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td>{n.alpn ? formatStringList(n.alpn) : "—"}</td>
                    <td class="mono">{n.fingerprint ?? "—"}</td>
                  </>
                )}
              />
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("extractor.flow.title")}>
            <div class="panel-title">{t("extractor.flow.title")}</div>
            {flowNodes.length === 0 ? (
              <p class="hint">{t("extractor.flow.hint")}</p>
            ) : (
              <VirtualTable
                items={flowNodes}
                columnCount={4}
                header={<tr><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.flow")}</th></tr>}
                renderRow={(n) => (
                  <>
                    <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                    <td class="mono">{n.address}</td>
                    <td class="mono"><bdi>{n.port}</bdi></td>
                    <td class="mono">{n.flow}</td>
                  </>
                )}
              />
            )}
          </div>
        </>
      )}
    </main>
  );
}
