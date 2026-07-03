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
import { PROTOCOLS } from "../../core/unm/schema/enums.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { sortNodesBySecurityScore, formatNodeSecurityScore, formatDeadNodesCandidate, formatScore } from "./format.js";
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

  return (
    <main class="subscription-screen">
      <h1>Subscription Center</h1>

      <section aria-label="Summary">
        <h2>Summary</h2>
        <dl>
          <dt>Total Nodes</dt><dd>{summary.totalNodes}</dd>
          <dt>Duplicate Nodes</dt><dd>{summary.duplicateNodeCount}</dd>
          <dt>Invalid Nodes</dt><dd>{summary.invalidNodeIds.length}</dd>
          <dt>Dead Nodes Candidate</dt><dd>{formatDeadNodesCandidate(summary.deadNodesCandidate)}</dd>
        </dl>

        <h3>Protocol Distribution</h3>
        {summary.totalNodes === 0 ? (
          <p class="hint">No nodes yet.</p>
        ) : (
          <table aria-label="Protocol Distribution">
            <thead><tr><th>Protocol</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(summary.protocolDistribution).map(([protocol, count]) => (
                <tr key={protocol}><td>{protocol}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Security Ranking</h3>
        {summary.securityRanking.length === 0 ? (
          <p class="hint">No nodes analyzed yet — visit the Analyzer Screen to score nodes.</p>
        ) : (
          <table aria-label="Security Ranking">
            <thead><tr><th>Address</th><th>Security Score</th></tr></thead>
            <tbody>
              {summary.securityRanking.map((entry) => {
                const n = nodes.find((candidate) => candidate.nodeId === entry.nodeId);
                return (
                  <tr key={entry.nodeId}>
                    <td>{n ? `${n.address}:${n.port}` : entry.nodeId}</td>
                    <td>{formatScore(entry.securityScore)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="Search">
        <h2>Search</h2>
        <input
          type="text"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search by protocol, address, or port…"
        />
      </section>

      <section aria-label="Filter">
        <h2>Filter</h2>
        <label>
          Protocol:{" "}
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter((e.target as HTMLSelectElement).value as ProtocolFilter)}
          >
            <option value="all">All</option>
            {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        {" "}
        <label>
          Validity:{" "}
          <select
            value={validityFilter}
            onChange={(e) => setValidityFilter((e.target as HTMLSelectElement).value as ValidityFilter)}
          >
            <option value="all">All</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>
        </label>
      </section>

      <section aria-label="Sort">
        <h2>Sort</h2>
        <label>
          Field:{" "}
          <select
            value={sortField}
            onChange={(e) => setSortField((e.target as HTMLSelectElement).value as SortField)}
          >
            <option value="createdAt">Imported At</option>
            <option value="protocol">Protocol</option>
            <option value="address">Address</option>
            <option value="port">Port</option>
            <option value="securityScore">Security Score</option>
          </select>
        </label>
        {" "}
        <label>
          Direction:{" "}
          <select
            value={sortDirection}
            disabled={sortField === "securityScore"}
            onChange={(e) => setSortDirection((e.target as HTMLSelectElement).value as SortDirection)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        {sortField === "securityScore" && (
          <p class="hint">Security Score sort is always highest-first (unscored nodes last).</p>
        )}
      </section>

      <section aria-label="Group">
        <h2>Group</h2>
        <label>
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped((e.target as HTMLInputElement).checked)}
          />
          {" "}Group by protocol
        </label>
      </section>

      <section aria-label="Node List">
        <h2>Node List</h2>
        <p class="hint">
          Showing {visibleNodes.length} of {nodes.length} node{nodes.length === 1 ? "" : "s"}.
        </p>
        {nodes.length === 0 ? (
          <p class="hint">No nodes yet — parse something on the Converter Screen first.</p>
        ) : visibleNodes.length === 0 ? (
          <p class="hint">No nodes match the current search/filter.</p>
        ) : groupedNodes ? (
          Object.entries(groupedNodes).map(([protocol, groupNodes]) => (
            <div key={protocol}>
              <h3>{protocol} ({groupNodes.length})</h3>
              <NodeTable nodes={groupNodes} analysisByNodeId={analysisByNodeId} latencyByNodeId={latencyByNodeId} testingNodeId={testingNodeId} onTestLatency={handleTestLatency} geoIpByNodeId={geoIpByNodeId} geoIpLoadingNodeId={geoIpLoadingNodeId} onGeoIpLookup={handleGeoIpLookup} portCheckByNodeId={portCheckByNodeId} portCheckLoadingNodeId={portCheckLoadingNodeId} onPortCheck={handlePortCheck} selectedNodeIds={selectedNodeIds} onToggleSelected={toggleNodeSelected} onSaveAsTemplate={handleSaveAsTemplate} />
            </div>
          ))
        ) : (
          <NodeTable nodes={visibleNodes} analysisByNodeId={analysisByNodeId} latencyByNodeId={latencyByNodeId} testingNodeId={testingNodeId} onTestLatency={handleTestLatency} geoIpByNodeId={geoIpByNodeId} geoIpLoadingNodeId={geoIpLoadingNodeId} onGeoIpLookup={handleGeoIpLookup} portCheckByNodeId={portCheckByNodeId} portCheckLoadingNodeId={portCheckLoadingNodeId} onPortCheck={handlePortCheck} selectedNodeIds={selectedNodeIds} onToggleSelected={toggleNodeSelected} onSaveAsTemplate={handleSaveAsTemplate} />
        )}
      </section>

      <section aria-label="Template Library">
        <h2>Template Library</h2>
        <p class="hint">
          A Template is exactly a saved node (doc 03 §6) — kept in its own cross-session
          library, separate from the working Node List above, so clearing/re-parsing never
          loses it. Check a node above and click "Save as Template", or select templates
          below to include them in the Subscription Builder.
        </p>
        {templates.length === 0 ? (
          <p class="hint">No templates saved yet.</p>
        ) : (
          <table aria-label="Template List">
            <thead>
              <tr><th>Include</th><th>Protocol</th><th>Address</th><th>Port</th><th>Remark</th><th></th></tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.nodeId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTemplateIds.has(t.nodeId)}
                      onChange={() => toggleTemplateSelected(t.nodeId)}
                    />
                  </td>
                  <td>{t.protocol}</td>
                  <td>{t.address}</td>
                  <td>{t.port}</td>
                  <td>{t.remark ?? "—"}</td>
                  <td>
                    <button type="button" onClick={() => handleRemoveTemplate(t.nodeId)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="Subscription Builder">
        <h2>Subscription Builder</h2>
        <p class="hint">
          Builds one Subscription blob from the checked nodes/templates above — the exact
          inverse of the Subscription Parser (paste this back into the Converter Screen and
          it reproduces the same nodes).
        </p>
        <p class="hint">
          Selected: {selectedNodeIds.size} node{selectedNodeIds.size === 1 ? "" : "s"}
          {" + "}
          {selectedTemplateIds.size} template{selectedTemplateIds.size === 1 ? "" : "s"}.
        </p>
        <label>
          Encoding:{" "}
          <select
            value={builderEncoding}
            onChange={(e) => setBuilderEncoding((e.target as HTMLSelectElement).value as "base64" | "plain")}
          >
            <option value="base64">Base64</option>
            <option value="plain">Plain Text</option>
          </select>
        </label>{" "}
        <button
          type="button"
          onClick={handleBuildSubscription}
          disabled={selectedNodeIds.size === 0 && selectedTemplateIds.size === 0}
        >
          Build Subscription
        </button>

        {builderResult && (
          <>
            <div class="actions">
              <button type="button" onClick={handleDownloadSubscription}>Download</button>
              <button type="button" onClick={handleCopySubscription}>Copy to Clipboard</button>
            </div>
            <h3>Preview</h3>
            <textarea readOnly rows={10} cols={80} value={builderResult.content} />
            {builderResult.skipped.length > 0 && (
              <p class="hint">
                Skipped: {builderResult.skipped.map((s) => `${s.protocol} (${s.reason})`).join(", ")}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function NodeTable({
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
    <table>
      <thead>
        <tr>
          <th>Include</th><th>Protocol</th><th>Address</th><th>Port</th><th>Valid</th><th>Security Score</th><th>Latency</th><th>Port Check</th><th>GeoIP</th><th>Imported At</th><th>Template</th>
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
              <td>{n.protocol}</td>
              <td>{n.address}</td>
              <td>{n.port}</td>
              <td>{String(n.validation.overallValid)}</td>
              <td>{formatNodeSecurityScore(analysisByNodeId, n.nodeId)}</td>
              <td>
                <button
                  disabled={isTesting}
                  onClick={() => onTestLatency(n.nodeId, n.address, n.port)}
                >
                  {isTesting ? "Testing…" : "Test"}
                </button>
                {latency !== undefined && !isTesting && (
                  <span>{" "}{formatLatency(latency)}</span>
                )}
              </td>
              <td>
                <button
                  disabled={isCheckingPort}
                  onClick={() => onPortCheck(n.nodeId, n.address, n.port)}
                >
                  {isCheckingPort ? "Checking…" : "Check"}
                </button>
                {portCheck !== undefined && !isCheckingPort && (
                  <span>{" "}{formatPortCheck(portCheck)}</span>
                )}
              </td>
              <td>
                <button
                  disabled={isLookingUp}
                  onClick={() => onGeoIpLookup(n.nodeId, n.address)}
                >
                  {isLookingUp ? "Loading…" : "Lookup"}
                </button>
                {geoIp !== undefined && !isLookingUp && (
                  <span>{" "}{formatGeoIp(geoIp)}</span>
                )}
              </td>
              <td>{n.createdAt}</td>
              <td>
                <button type="button" onClick={() => onSaveAsTemplate(n)}>Save as Template</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
