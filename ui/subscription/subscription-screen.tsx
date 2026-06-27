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
} from "../../core/store/selectors.js";
import { PROTOCOLS } from "../../core/unm/schema/enums.js";
import { useParserState } from "../store/use-parser-state.js";

type ProtocolFilter = "all" | (typeof PROTOCOLS)[number];
type ValidityFilter = "all" | "valid" | "invalid";
type SortField = "protocol" | "address" | "port" | "createdAt";
type SortDirection = "asc" | "desc";

export function SubscriptionScreen() {
  const nodes = useParserState();
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>("all");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [grouped, setGrouped] = useState(false);

  const visibleNodes = useMemo(() => {
    const searched = selectNodesMatchingSearch({ nodes }, search);
    const byProtocol = selectNodesFilteredByProtocol({ nodes: searched }, protocolFilter);
    const byValidity = selectNodesFilteredByValidity({ nodes: byProtocol }, validityFilter);
    return selectNodesSortedByField({ nodes: byValidity }, sortField, sortDirection);
  }, [nodes, search, protocolFilter, validityFilter, sortField, sortDirection]);

  const groupedNodes = useMemo(
    () => (grouped ? selectNodesGroupedByProtocol({ nodes: visibleNodes }) : null),
    [grouped, visibleNodes],
  );

  return (
    <main class="subscription-screen">
      <h1>Subscription Center</h1>

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
          </select>
        </label>
        {" "}
        <label>
          Direction:{" "}
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection((e.target as HTMLSelectElement).value as SortDirection)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
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
              <NodeTable nodes={groupNodes} />
            </div>
          ))
        ) : (
          <NodeTable nodes={visibleNodes} />
        )}
      </section>
    </main>
  );
}

function NodeTable({ nodes }: { nodes: ReturnType<typeof useParserState> }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Protocol</th><th>Address</th><th>Port</th><th>Valid</th><th>Imported At</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((n) => (
          <tr key={n.nodeId}>
            <td>{n.protocol}</td>
            <td>{n.address}</td>
            <td>{n.port}</td>
            <td>{String(n.validation.overallValid)}</td>
            <td>{n.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
