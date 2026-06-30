/**
 * Performance State Preact bridge — polls the three Worker pool managers
 * every second and exposes a reactive snapshot for the Developer Console's
 * Performance Logs section (07-UI_UX_SYSTEM §4.7, Phase 12 P12-2).
 *
 * Polling (1 s interval) rather than push was chosen deliberately: unlike
 * node-level analysis data, pool metrics change on every job dispatch and
 * are low-priority UI — a 1-second refresh is adequate and avoids adding
 * cross-module side-effect calls to the Worker clients. The interval is
 * cleared on unmount, so DevConsole route switches do not leak timers.
 *
 * When a pool runs in main-thread fallback mode (file:// origin, ADR-016)
 * its manager is null and `getXxxPoolStats()` returns null — displayed as
 * "N/A" in the UI (Rule 9: never fabricate data).
 */
import { useState, useEffect } from "preact/hooks";
import { getParserPoolStats } from "./parser-worker-client.js";
import { getAnalyzerPoolStats } from "./analyzer-worker-client.js";
import { getConverterPoolStats } from "../converter/converter-worker-client.js";

export type PoolStats = NonNullable<ReturnType<typeof getParserPoolStats>>;

export interface PoolSnapshot {
  parser: PoolStats | null;
  analyzer: PoolStats | null;
  converter: PoolStats | null;
}

const REFRESH_INTERVAL_MS = 1000;

function captureSnapshot(): PoolSnapshot {
  return {
    parser: getParserPoolStats(),
    analyzer: getAnalyzerPoolStats(),
    converter: getConverterPoolStats(),
  };
}

export function usePerformanceState(): PoolSnapshot {
  const [snapshot, setSnapshot] = useState<PoolSnapshot>(captureSnapshot);

  useEffect(() => {
    const id = setInterval(() => setSnapshot(captureSnapshot()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return snapshot;
}
