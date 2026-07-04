/**
 * Subscription Center Screen (07-UI_UX_SYSTEM §4.4) — the fourth real Phase 9
 * screen. This first pass covers exactly the "core" scope confirmed with the
 * user: Node List + Search + Filter (protocol/validity) + Sort + Group, all
 * built on `core/store/selectors.js`'s pure Selectors over the existing
 * `parserStore` — no new Core logic, no new Store.
 *
 * Deliberately deferred past this pass (each needs genuinely new
 * architecture, decided separately): Tag, Merge Subscription, Split
 * Subscription, Deduplicate Nodes (doc 07 §4.4 / doc 03 §2.1). Rendering is
 * plain Preact `.map()` over the node array — no Virtual List dependency —
 * per the user's confirmed choice to defer that pick until there is real
 * large-scale (10,000+ node) data to measure against (doc 14's "Actively
 * Maintained" requirement could not be cheaply verified for a library
 * picked speculatively now).
 *
 * Visual design (final visual design phase, Subscription Center step):
 * restyled onto the same Liquid Glass system as Dashboard/Converter/
 * Analyzer, reusing their exact classes (`.glass-panel`, `.panel-grid`,
 * `.kv-list`/`.kv-row`, `.data-table`, `.tag`, `.btn`, `.select`,
 * `.code-textarea`, `.hint`) plus Dashboard's `.dist-item`/`.dist-track`/
 * `.dist-fill` bar-chart classes for Protocol Distribution (previously
 * hand-rolled inline-style `<div>`s here — now the same bars Dashboard's
 * Protocol Mix panel already draws, not a second implementation). Three
 * small new classes were added to `assets/css/theme.css` for this step:
 * `.input` (a styled text input; only `.select`/`.code-textarea` existed
 * before), `.btn--sm` (compact per-row actions — this screen's Node List
 * has four buttons per row), and `.field` (inline "Label: control"
 * pairs). No logic/state/handlers changed — same selectors, same
 * network-check handlers, same Template/Subscription Builder flow.
 */
import { useMemo, useState } from "preact/hooks";
import {
  selectNodesMatchingSearch,
  selectNodesFilteredByProtocol,
  selectNodesFilteredByValidity,
  selectNodesSortedByField,
  selectNodesGroupedByProtocol,
  selectSubscriptionSummary,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { PROTOCOLS } from "../../core/unm/schema/enums.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { sortNodesBySecurityScore, formatNodeSecurityScore, formatDeadNodesCandidate, formatScore } from "./format.js";
import { buildProtocolBars } from "./chart.js";
import { PROTOCOL_ABBREVIATION } from "../components/protocol-labels.js";
import { measureLatency } from "../../core/network/latency.js";
import { lookupGeoIp } from "../../core/network/geoip.js";
import { checkPort } from "../../core/network/port-check.js";
import { buildSubscription } from "../../core/exporter/subscription-builder.js";
import { useTemplateState, templateLibraryStore } from "../store/use-template-state.js";

type LatencyResult =
  | { status: "ok"; rtt: number }
  | { status: "unreachable"; rtt: null }
  | { status: "timeout"; rtt: null };

type GeoIpResult =
  | { status: "ok"; country: string; region: string; asn: string; isp: string }
  | { status: "private"; country: null; region: null; asn: null; isp: null }
  | { status: "error"; country: null; region: null; asn: null; isp: null };

// Shares core/network/shared.js's probe with LatencyResult (see port-check.js's
// module doc) — a separate presentation of the same underlying measurement,
// not a second independent network mechanism.
type PortCheckResult =
  | { status: "open"; latencyMs: number }
  | { status: "closed" }
  | { status: "unknown" };

function formatLatency(r: LatencyResult): string {
  if (r.status === "ok") return `${r.rtt} ms`;
  if (r.status === "timeout") return "Timeout";
  return "Unreachable";
}

function formatPortCheck(r: PortCheckResult): string {
  if (r.status === "open") return `Open (${r.latencyMs} ms)`;
  if (r.status === "closed") return "Closed";
  return "Unknown";
}

function formatGeoIp(r: GeoIpResult): string {
  if (r.status === "ok") return `${r.country} / ${r.region} · ${r.asn} ${r.isp}`.trim();
  if (r.status === "private") return "Private";
  return "Error";
}

type ProtocolFilter = "all" | (typeof PROTOCOLS)[number];
type ValidityFilter = "all" | "valid" | "invalid";
type SortField = "protocol" | "address" | "port" | "createdAt" | "securityScore";
type SortDirection = "asc" | "desc";
type AnalysisByNodeId = ReturnType<typeof useAnalyzerState>;

export function SubscriptionScreen() {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>("all");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [grouped, setGrouped] = useState(false);
  const [latencyByNodeId, setLatencyByNodeId] = useState<Record<string, LatencyResult>>({});
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
  const [geoIpByNodeId, setGeoIpByNodeId] = useState<Record<string, GeoIpResult>>({});
  const [geoIpLoadingNodeId, setGeoIpLoadingNodeId] = useState<string | null>(null);
  const [portCheckByNodeId, setPortCheckByNodeId] = useState<Record<string, PortCheckResult>>({});
  const [portCheckLoadingNodeId, setPortCheckLoadingNodeId] = useState<string | null>(null);
  const templates = useTemplateState();
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [builderEncoding, setBuilderEncoding] = useState<"base64" | "plain">("base64");
  const [builderResult, setBuilderResult] = useState<{ content: string; skipped: { nodeId: string; protocol: string; reason: string }[] } | null>(null);

  async function handleTestLatency(nodeId: string, address: string, port: number) {
    setTestingNodeId(nodeId);
    const result = await measureLatency({ address, port });
    setLatencyByNodeId((prev) => ({ ...prev, [nodeId]: result }));
    setTestingNodeId(null);
  }

  async function handleGeoIpLookup(nodeId: string, address: string) {
    setGeoIpLoadingNodeId(nodeId);
    const result = await lookupGeoIp({ address });
    setGeoIpByNodeId((prev) => ({ ...prev, [nodeId]: result }));
    setGeoIpLoadingNodeId(null);
  }

  async function handlePortCheck(nodeId: string, address: string, port: number) {
    setPortCheckLoadingNodeId(nodeId);
    const result = await checkPort({ address, port });
    setPortCheckByNodeId((prev) => ({ ...prev, [nodeId]: result }));
    setPortCheckLoadingNodeId(null);
  }

  function toggleNodeSelected(nodeId: string) {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function toggleTemplateSelected(nodeId: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function handleSaveAsTemplate(node: (typeof nodes)[number]) {
    templateLibraryStore.addTemplate(node);
  }

  function handleRemoveTemplate(nodeId: string) {
    templateLibraryStore.removeTemplate(nodeId);
    setSelectedTemplateIds((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }

  function handleBuildSubscription() {
    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.nodeId));
    const selectedTemplates = templates.filter((t) => selectedTemplateIds.has(t.nodeId));
    setBuilderResult(buildSubscription([...selectedNodes, ...selectedTemplates], { encoding: builderEncoding }));
  }

  function handleDownloadSubscription() {
    if (!builderResult) return;
    const blob = new Blob([builderResult.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscription.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopySubscription() {
    if (!builderResult) return;
    await navigator.clipboard.writeText(builderResult.content);
  }

  const visibleNodes = useMemo(() => {
    const searched = selectNodesMatchingSearch({ nodes }, search);
    const byProtocol = selectNodesFilteredByProtocol({ nodes: searched }, protocolFilter);
    const byValidity = selectNodesFilteredByValidity({ nodes: byProtocol }, validityFilter);
    if (sortField === "securityScore") {
      return sortNodesBySecurityScore(byValidity, analysisByNodeId);
    }
    return selectNodesSortedByField({ nodes: byValidity }, sortField, sortDirection);
  }, [nodes, search, protocolFilter, validityFilter, sortField, sortDirection, analysisByNodeId]);

  const groupedNodes = useMemo(
    () => (grouped ? selectNodesGroupedByProtocol({ nodes: visibleNodes }) : null),
    [grouped, visibleNodes],
  );

  const summary = useMemo(
    () => selectSubscriptionSummary({ nodes }, { analysisByNodeId }),
    [nodes, analysisByNodeId],
  );

  const protocolBars = useMemo(() => buildProtocolBars(summary.protocolDistribution), [summary]);

  return (
    <main class="subscription-screen">
      <div class="screen-header">
        <h1 class="screen-title">{t("subscription.title")}</h1>
        <p class="screen-subtitle">
          {t("subscription.subtitle")}
        </p>
      </div>

      <div class="panel-grid" style={{ marginBlockEnd: "20px" }}>
        <div class="panel glass-panel" aria-label={t("subscription.overview.title")}>
          <div class="panel-title">{t("subscription.overview.title")}</div>
          <dl class="kv-list">
            <div class="kv-row"><dt>{t("subscription.overview.totalNodes")}</dt><dd><bdi>{summary.totalNodes}</bdi></dd></div>
            <div class="kv-row"><dt>{t("subscription.overview.duplicateNodes")}</dt><dd><bdi>{summary.duplicateNodeCount}</bdi></dd></div>
            <div class="kv-row"><dt>{t("subscription.overview.invalidNodes")}</dt><dd><bdi>{summary.invalidNodeIds.length}</bdi></dd></div>
            <div class="kv-row"><dt>{t("subscription.overview.deadNodesCandidate")}</dt><dd>{formatDeadNodesCandidate(summary.deadNodesCandidate)}</dd></div>
          </dl>
        </div>

        <div class="panel glass-panel" aria-label={t("subscription.protocolDistribution.title")}>
          <div class="panel-title">{t("subscription.protocolDistribution.title")}</div>
          {summary.totalNodes === 0 ? (
            <p class="hint">{t("common.noNodesYetShort")}</p>
          ) : (
            protocolBars.map(({ protocol, count, percent }) => (
              <div class="dist-item" key={protocol}>
                <div class="dist-head">
                  <span>{protocol}</span>
                  <span class="n"><bdi>{count}</bdi></span>
                </div>
                <div class="dist-track">
                  <div class={`dist-fill protocol-badge--${protocol}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div class="panel glass-panel" aria-label={t("subscription.securityRanking.title")}>
          <div class="panel-title">{t("subscription.securityRanking.title")}</div>
          {summary.securityRanking.length === 0 ? (
            <p class="hint">{t("subscription.securityRanking.emptyHint")}</p>
          ) : (
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>{t("common.fields.address")}</th><th>{t("subscription.securityRanking.scoreColumn")}</th></tr></thead>
                <tbody>
                  {summary.securityRanking.map((entry) => {
                    const n = nodes.find((candidate) => candidate.nodeId === entry.nodeId);
                    return (
                      <tr key={entry.nodeId}>
                        <td class="mono">{n ? <>{n.address}:<bdi>{n.port}</bdi></> : entry.nodeId}</td>
                        <td>{formatScore(entry.securityScore)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("subscription.listControls.title")}>
        <div class="panel-title">{t("subscription.listControls.title")}</div>
        <div class="form-actions" style={{ marginBlockStart: 0 }}>
          <input
            type="text"
            class="input"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder={t("subscription.search.placeholder")}
          />
          <label class="field">
            {t("subscription.filter.protocolLabel")}
            <select
              class="select"
              value={protocolFilter}
              onChange={(e) => setProtocolFilter((e.target as HTMLSelectElement).value as ProtocolFilter)}
            >
              <option value="all">{t("common.all")}</option>
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label class="field">
            {t("subscription.filter.validityLabel")}
            <select
              class="select"
              value={validityFilter}
              onChange={(e) => setValidityFilter((e.target as HTMLSelectElement).value as ValidityFilter)}
            >
              <option value="all">{t("common.all")}</option>
              <option value="valid">{t("subscription.filter.valid")}</option>
              <option value="invalid">{t("subscription.filter.invalid")}</option>
            </select>
          </label>
          <label class="field">
            {t("subscription.sort.label")}
            <select
              class="select"
              value={sortField}
              onChange={(e) => setSortField((e.target as HTMLSelectElement).value as SortField)}
            >
              <option value="createdAt">{t("subscription.sort.optionImportedAt")}</option>
              <option value="protocol">{t("common.fields.protocol")}</option>
              <option value="address">{t("common.fields.address")}</option>
              <option value="port">{t("common.fields.port")}</option>
              <option value="securityScore">{t("subscription.sort.optionSecurityScore")}</option>
            </select>
          </label>
          <label class="field">
            {t("subscription.sort.directionLabel")}
            <select
              class="select"
              value={sortDirection}
              disabled={sortField === "securityScore"}
              onChange={(e) => setSortDirection((e.target as HTMLSelectElement).value as SortDirection)}
            >
              <option value="asc">{t("subscription.sort.ascending")}</option>
              <option value="desc">{t("subscription.sort.descending")}</option>
            </select>
          </label>
          <label class="field">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(e) => setGrouped((e.target as HTMLInputElement).checked)}
            />
            {t("subscription.group.byProtocol")}
          </label>
        </div>
        {sortField === "securityScore" && (
          <p class="hint" style={{ marginBlockStart: "12px" }}>{t("subscription.sort.hint")}</p>
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("subscription.nodeList.title")}>
        <div class="panel-title">{t("subscription.nodeList.title")}</div>
        <p class="hint">
          {t("subscription.nodeList.showing")} <bdi>{visibleNodes.length}</bdi> {t("subscription.nodeList.of")} <bdi>{nodes.length}</bdi> {t(nodes.length === 1 ? "subscription.nodeList.nodeSingular" : "subscription.nodeList.nodePlural")}
        </p>
        {nodes.length === 0 ? (
          <p class="hint">{t("common.noNodesYet")}</p>
        ) : visibleNodes.length === 0 ? (
          <p class="hint">{t("subscription.nodeList.noMatch")}</p>
        ) : groupedNodes ? (
          Object.entries(groupedNodes).map(([protocol, groupNodes], i) => (
            <div key={protocol} style={{ marginBlockStart: i === 0 ? "14px" : "22px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBlockEnd: "8px" }}>
                {protocol} (<bdi>{groupNodes.length}</bdi>)
              </div>
              <NodeTable t={t} nodes={groupNodes} analysisByNodeId={analysisByNodeId} latencyByNodeId={latencyByNodeId} testingNodeId={testingNodeId} onTestLatency={handleTestLatency} geoIpByNodeId={geoIpByNodeId} geoIpLoadingNodeId={geoIpLoadingNodeId} onGeoIpLookup={handleGeoIpLookup} portCheckByNodeId={portCheckByNodeId} portCheckLoadingNodeId={portCheckLoadingNodeId} onPortCheck={handlePortCheck} selectedNodeIds={selectedNodeIds} onToggleSelected={toggleNodeSelected} onSaveAsTemplate={handleSaveAsTemplate} />
            </div>
          ))
        ) : (
          <div style={{ marginBlockStart: "14px" }}>
            <NodeTable t={t} nodes={visibleNodes} analysisByNodeId={analysisByNodeId} latencyByNodeId={latencyByNodeId} testingNodeId={testingNodeId} onTestLatency={handleTestLatency} geoIpByNodeId={geoIpByNodeId} geoIpLoadingNodeId={geoIpLoadingNodeId} onGeoIpLookup={handleGeoIpLookup} portCheckByNodeId={portCheckByNodeId} portCheckLoadingNodeId={portCheckLoadingNodeId} onPortCheck={handlePortCheck} selectedNodeIds={selectedNodeIds} onToggleSelected={toggleNodeSelected} onSaveAsTemplate={handleSaveAsTemplate} />
          </div>
        )}
      </div>

      <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("subscription.templateLibrary.title")}>
        <div class="panel-title">{t("subscription.templateLibrary.title")}</div>
        <p class="hint">
          {t("subscription.templateLibrary.hint")}
        </p>
        {templates.length === 0 ? (
          <p class="hint">{t("subscription.templateLibrary.empty")}</p>
        ) : (
          <div class="table-scroll" style={{ marginBlockStart: "12px" }}>
            <table class="data-table">
              <thead>
                <tr><th>{t("subscription.nodeList.includeColumn")}</th><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("subscription.templateLibrary.remarkColumn")}</th><th></th></tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.nodeId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.has(tpl.nodeId)}
                        onChange={() => toggleTemplateSelected(tpl.nodeId)}
                      />
                    </td>
                    <td><span class={`protocol-badge protocol-badge--${tpl.protocol}`}>{PROTOCOL_ABBREVIATION[tpl.protocol]}</span></td>
                    <td class="mono">{tpl.address}</td>
                    <td class="mono"><bdi>{tpl.port}</bdi></td>
                    <td>{tpl.remark ?? "—"}</td>
                    <td>
                      <button type="button" class="btn btn--ghost btn--sm" onClick={() => handleRemoveTemplate(tpl.nodeId)}>{t("subscription.templateLibrary.delete")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div class="panel glass-panel" aria-label={t("subscription.builder.title")}>
        <div class="panel-title">{t("subscription.builder.title")}</div>
        <p class="hint">
          {t("subscription.builder.hint")}
        </p>
        <p class="hint" style={{ marginBlockStart: "6px" }}>
          {t("subscription.builder.selectedPrefix")} <bdi>{selectedNodeIds.size}</bdi> {t(selectedNodeIds.size === 1 ? "subscription.builder.nodeSingular" : "subscription.builder.nodePlural")}
          {" + "}
          <bdi>{selectedTemplateIds.size}</bdi> {t(selectedTemplateIds.size === 1 ? "subscription.builder.templateSingular" : "subscription.builder.templatePlural")}.
        </p>
        <div class="form-actions">
          <label class="field">
            {t("subscription.builder.encodingLabel")}
            <select
              class="select"
              value={builderEncoding}
              onChange={(e) => setBuilderEncoding((e.target as HTMLSelectElement).value as "base64" | "plain")}
            >
              <option value="base64">{t("subscription.builder.base64")}</option>
              <option value="plain">{t("subscription.builder.plainText")}</option>
            </select>
          </label>
          <button
            type="button"
            class="btn btn--primary"
            onClick={handleBuildSubscription}
            disabled={selectedNodeIds.size === 0 && selectedTemplateIds.size === 0}
          >
            {t("subscription.builder.build")}
          </button>
        </div>

        {builderResult && (
          <>
            <div class="form-actions">
              <button type="button" class="btn btn--ghost" onClick={handleDownloadSubscription}>{t("common.actions.download")}</button>
              <button type="button" class="btn btn--ghost" onClick={handleCopySubscription}>{t("common.actions.copyToClipboard")}</button>
            </div>
            <textarea class="code-textarea" style={{ marginBlockStart: "14px" }} readOnly rows={10} value={builderResult.content} />
            {builderResult.skipped.length > 0 && (
              <p class="hint" style={{ marginBlockStart: "10px" }}>
                {t("common.skippedPrefix")}{builderResult.skipped.map((s) => `${s.protocol} (${s.reason})`).join(", ")}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function NodeTable({
  t,
  nodes,
  analysisByNodeId,
  latencyByNodeId,
  testingNodeId,
  onTestLatency,
  geoIpByNodeId,
  geoIpLoadingNodeId,
  onGeoIpLookup,
  portCheckByNodeId,
  portCheckLoadingNodeId,
  onPortCheck,
  selectedNodeIds,
  onToggleSelected,
  onSaveAsTemplate,
}: {
  t: (key: string) => string;
  nodes: ReturnType<typeof useParserState>;
  analysisByNodeId: AnalysisByNodeId;
  latencyByNodeId: Record<string, LatencyResult>;
  testingNodeId: string | null;
  onTestLatency: (nodeId: string, address: string, port: number) => void;
  geoIpByNodeId: Record<string, GeoIpResult>;
  geoIpLoadingNodeId: string | null;
  onGeoIpLookup: (nodeId: string, address: string) => void;
  portCheckByNodeId: Record<string, PortCheckResult>;
  portCheckLoadingNodeId: string | null;
  onPortCheck: (nodeId: string, address: string, port: number) => void;
  selectedNodeIds: Set<string>;
  onToggleSelected: (nodeId: string) => void;
  onSaveAsTemplate: (node: ReturnType<typeof useParserState>[number]) => void;
}) {
  return (
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{t("subscription.nodeList.includeColumn")}</th><th>{t("common.fields.protocol")}</th><th>{t("common.fields.address")}</th><th>{t("common.fields.port")}</th><th>{t("common.fields.valid")}</th><th>{t("subscription.securityRanking.scoreColumn")}</th><th>{t("subscription.nodeList.latencyColumn")}</th><th>{t("subscription.nodeList.portCheckColumn")}</th><th>{t("subscription.nodeList.geoIpColumn")}</th><th>{t("common.fields.importedAt")}</th><th>{t("subscription.nodeList.templateColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => {
            const latency = latencyByNodeId[n.nodeId];
            const isTesting = testingNodeId === n.nodeId;
            const geoIp = geoIpByNodeId[n.nodeId];
            const isLookingUp = geoIpLoadingNodeId === n.nodeId;
            const portCheck = portCheckByNodeId[n.nodeId];
            const isCheckingPort = portCheckLoadingNodeId === n.nodeId;
            return (
              <tr key={n.nodeId}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedNodeIds.has(n.nodeId)}
                    onChange={() => onToggleSelected(n.nodeId)}
                  />
                </td>
                <td><span class={`protocol-badge protocol-badge--${n.protocol}`}>{PROTOCOL_ABBREVIATION[n.protocol]}</span></td>
                <td class="mono">{n.address}</td>
                <td class="mono"><bdi>{n.port}</bdi></td>
                <td>
                  {n.validation.overallValid ? (
                    <span class="tag tag--valid">{t("common.fields.valid")}</span>
                  ) : (
                    <span class="tag tag--invalid">{t("common.fields.invalid")}</span>
                  )}
                </td>
                <td>{formatNodeSecurityScore(analysisByNodeId, n.nodeId)}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    disabled={isTesting}
                    onClick={() => onTestLatency(n.nodeId, n.address, n.port)}
                  >
                    {isTesting ? t("subscription.nodeList.testing") : t("subscription.nodeList.test")}
                  </button>
                  {latency !== undefined && !isTesting && (
                    <span class="hint">{" "}{formatLatency(latency)}</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    disabled={isCheckingPort}
                    onClick={() => onPortCheck(n.nodeId, n.address, n.port)}
                  >
                    {isCheckingPort ? t("subscription.nodeList.checking") : t("subscription.nodeList.check")}
                  </button>
                  {portCheck !== undefined && !isCheckingPort && (
                    <span class="hint">{" "}{formatPortCheck(portCheck)}</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    disabled={isLookingUp}
                    onClick={() => onGeoIpLookup(n.nodeId, n.address)}
                  >
                    {isLookingUp ? t("subscription.nodeList.loading") : t("subscription.nodeList.lookup")}
                  </button>
                  {geoIp !== undefined && !isLookingUp && (
                    <span class="hint">{" "}{formatGeoIp(geoIp)}</span>
                  )}
                </td>
                <td class="mono"><bdi>{n.createdAt}</bdi></td>
                <td>
                  <button type="button" class="btn btn--ghost btn--sm" onClick={() => onSaveAsTemplate(n)}>{t("subscription.nodeList.saveAsTemplate")}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
