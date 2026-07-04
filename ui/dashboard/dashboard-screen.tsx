/**
 * Dashboard Screen (07-UI_UX_SYSTEM §4.1) — redesigned to match the approved
 * Liquid Glass reference (docs/design/dashboard-reference.html, final visual
 * design phase, step 2). Layout/density/element-sizing follow that reference
 * precisely; every number is still read straight out of the same two stores
 * the Converter/Analyzer Screens already write into (`parserStore`,
 * `analyzerStore`) through Selectors — Rule 11's boundary, unchanged from
 * before this redesign — nothing here is a new computation.
 *
 * Doc 07 §4.1 lists six sections: Quick Stats, Recent Imports, Recent
 * Exports, Node Summary, Health Overview, Warnings. This redesign keeps the
 * exact same real-vs-placeholder boundaries the previous version already
 * established (see git history for the reasoning) — "Recent Exports" still
 * has no backing data anywhere in the app and is omitted rather than shown
 * empty; "Quick Stats"/"Node Summary"/"Health Overview" are now the stat
 * row + Protocol Mix panel; "Warnings" appears only when there are any
 * (Rule 9: no empty section pretending to be informative).
 *
 * `.glass-panel`/`.signal-ring`/`.protocol-badge` all come from
 * `assets/css/theme.css` (07-UI_UX_SYSTEM §2) — nothing here re-implements
 * that CSS. `onNavigate` is an optional callback (wired to real screen
 * switching by `ui/main.tsx`) so the CTA/action buttons the reference mockup
 * shows as real UI affordances actually do something rather than sitting
 * dead — a natural completion of a visibly-labeled, obviously-actionable
 * button, not scope creep into new architecture.
 */
import { useMemo } from "preact/hooks";
import {
  selectValidNodeIds,
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectNodesSortedByCreatedAt,
  selectAverageSecurityScore,
  selectAnalysisByNodeId,
} from "../../core/store/selectors.js";
import { createTranslator } from "../../core/i18n/translator.js";
import { useParserState } from "../store/use-parser-state.js";
import { useAnalyzerState } from "../store/use-analyzer-state.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { Logo } from "../components/logo.js";
import {
  formatAverageScore,
  securityBadgeTier,
  formatRelativeTime,
  buildProtocolShareBars,
  PROTOCOL_ABBREVIATION,
  PROTOCOL_DISPLAY_NAME,
  SECURITY_TYPE_DISPLAY_NAME,
} from "./format.js";

const RECENT_IMPORTS_LIMIT = 5;

export function DashboardScreen({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const nodes = useParserState();
  const analysisByNodeId = useAnalyzerState();
  useSettingsState();
  const t = createTranslator(settingsStore);

  const validCount = useMemo(() => selectValidNodeIds({ nodes }).length, [nodes]);
  const protocolCounts = useMemo(() => selectProtocolCounts({ nodes }), [nodes]);
  const warnings = useMemo(() => selectAggregatedWarnings({ nodes }), [nodes]);
  const recentImports = useMemo(
    () => selectNodesSortedByCreatedAt({ nodes }).slice(0, RECENT_IMPORTS_LIMIT),
    [nodes],
  );
  const averageSecurityScore = useMemo(
    () => selectAverageSecurityScore({ analysisByNodeId }),
    [analysisByNodeId],
  );
  const protocolShareBars = useMemo(() => buildProtocolShareBars(protocolCounts), [protocolCounts]);

  const distinctProtocolCount = Object.keys(protocolCounts).length;
  const lastUpdatedAt = recentImports[0]?.createdAt;

  return (
    <main class="dashboard-screen">
      <header class="app-header">
        <div class="logo-block">
          <Logo size={42} />
          <div>
            <div class="logo-text">UNCT</div>
            <div class="logo-sub">{t("dashboard.header.subtitle")}</div>
          </div>
        </div>
        <div class="status-chip glass-panel">
          <span class="pulse" />
          {nodes.length === 0 ? (
            t("dashboard.header.noNodesYet")
          ) : (
            <><bdi>{nodes.length}</bdi> {t(nodes.length === 1 ? "dashboard.header.nodeReadySingular" : "dashboard.header.nodeReadyPlural")}</>
          )}
        </div>
      </header>

      <section class="hero-band glass-panel" aria-label={t("dashboard.hero.ariaLabel")}>
        <div class="hero-text">
          <div class="eyebrow">{t("dashboard.hero.eyebrow")}</div>
          <h1>
            {nodes.length === 0 ? t("dashboard.hero.titleEmpty") : t("dashboard.hero.titleReady")}
          </h1>
          <p>
            {nodes.length === 0 ? (
              t("dashboard.hero.noNodesParsed")
            ) : (
              <>
                {formatAverageScore(averageSecurityScore)} {t("dashboard.hero.statsAcross")} <bdi>{nodes.length}</bdi> {t("dashboard.hero.statsNodes")}
                {lastUpdatedAt && <> &middot; {t("dashboard.hero.statsUpdatedPrefix")} {formatRelativeTime(lastUpdatedAt)}</>}
              </>
            )}
          </p>
        </div>
        <button type="button" class="hero-cta" onClick={() => onNavigate?.("converter")}>
          {t("dashboard.hero.importCta")}
        </button>
      </section>

      <div class="stat-row">
        <div class="stat-card glass-panel">
          <div class="stat-icon stat-icon--nodes">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke="var(--unct-purple)" stroke-width="1.8" stroke-linejoin="round" />
              <path d="M4 7L12 11L20 7M12 11V21" stroke="var(--unct-purple)" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="stat-label">{t("dashboard.stats.totalNodes")}</div>
          <div class="stat-value"><bdi>{nodes.length}</bdi></div>
        </div>

        <div class="stat-card glass-panel">
          <div
            class="signal-ring"
            style={{ "--signal-size": "36px", "--signal-value": String(averageSecurityScore ?? 0) } as Record<string, string>}
          />
          <div class="stat-label">{t("dashboard.stats.avgSecurity")}</div>
          <div class="stat-value stat-value--mint">
            {averageSecurityScore === null ? t("common.na") : <><bdi>{Math.round(averageSecurityScore)}</bdi><small>/100</small></>}
          </div>
        </div>

        <div class="stat-card glass-panel">
          <div class="stat-icon stat-icon--valid">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <circle cx="12" cy="12" r="9" stroke="var(--unct-pink)" stroke-width="1.8" />
              <path d="M8.5 12.5L10.8 15L15.5 9" stroke="var(--unct-pink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="stat-label">{t("dashboard.stats.validNodes")}</div>
          <div class="stat-value"><bdi>{validCount}</bdi><small>/<bdi>{nodes.length}</bdi></small></div>
        </div>

        <div class="stat-card glass-panel">
          <div class="stat-icon stat-icon--protocols">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <circle cx="12" cy="12" r="9" stroke="var(--unct-amber)" stroke-width="1.8" />
              <path d="M3 12H21M12 3C14.5 5.5 15.8 8.6 15.8 12C15.8 15.4 14.5 18.5 12 21C9.5 18.5 8.2 15.4 8.2 12C8.2 8.6 9.5 5.5 12 3Z" stroke="var(--unct-amber)" stroke-width="1.8" />
            </svg>
          </div>
          <div class="stat-label">{t("dashboard.stats.protocols")}</div>
          <div class="stat-value"><bdi>{distinctProtocolCount}</bdi></div>
        </div>
      </div>

      <div class="content-grid">
        <div class="panel glass-panel" aria-label={t("dashboard.recentImports.title")}>
          <div class="panel-title">
            {t("dashboard.recentImports.title")}
            <button type="button" class="see-all" onClick={() => onNavigate?.("subscription")}>{t("dashboard.recentImports.seeAll")} <span class="cta-arrow">&rarr;</span></button>
          </div>
          {recentImports.length === 0 ? (
            <p class="hint">{t("common.noNodesYet")}</p>
          ) : (
            recentImports.map((n) => {
              const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
              return (
                <div class="node-item" key={n.nodeId}>
                  <span class={`protocol-badge protocol-badge--lg protocol-badge--${n.protocol}`}>
                    {PROTOCOL_ABBREVIATION[n.protocol]}
                  </span>
                  <div class="node-info">
                    <div class="node-addr mono">{n.address}:<bdi>{n.port}</bdi></div>
                    <div class="node-meta">
                      {PROTOCOL_DISPLAY_NAME[n.protocol]} &middot; {SECURITY_TYPE_DISPLAY_NAME[n.security]} &middot; {formatRelativeTime(n.createdAt)}
                    </div>
                  </div>
                  {bundle && (
                    <div class={`node-score ${securityBadgeTier(bundle.security.securityScore)}`}>
                      <bdi>{Math.round(bundle.security.securityScore)}</bdi>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div>
          <div class="panel glass-panel" style={{ marginBlockEnd: "20px" }} aria-label={t("dashboard.protocolMix.title")}>
            <div class="panel-title">{t("dashboard.protocolMix.title")}</div>
            {protocolShareBars.length === 0 ? (
              <p class="hint">{t("common.noNodesYetShort")}</p>
            ) : (
              protocolShareBars.map((bar) => (
                <div class="dist-item" key={bar.protocol}>
                  <div class="dist-head">
                    <span>{PROTOCOL_DISPLAY_NAME[bar.protocol as keyof typeof PROTOCOL_DISPLAY_NAME] ?? bar.protocol}</span>
                    <span class="n"><bdi>{bar.count}</bdi></span>
                  </div>
                  <div class="dist-track">
                    <div class={`dist-fill protocol-badge--${bar.protocol}`} style={{ width: `${bar.percent}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div class="panel glass-panel" aria-label={t("dashboard.quickActions.title")}>
            <div class="panel-title">{t("dashboard.quickActions.title")}</div>
            <button type="button" class="action-btn primary" onClick={() => onNavigate?.("converter")}>
              <span>{t("dashboard.quickActions.importConfig")}</span><span>+</span>
            </button>
            <button type="button" class="action-btn secondary" onClick={() => onNavigate?.("export")}>
              <span>{t("dashboard.quickActions.exportAll")}</span><span class="cta-arrow">&rarr;</span>
            </button>
            <button type="button" class="action-btn secondary" onClick={() => onNavigate?.("devconsole")}>
              <span>{t("dashboard.quickActions.runDiagnostics")}</span><span class="cta-arrow">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <section class="panel glass-panel" aria-label={t("dashboard.warnings.title")} style={{ marginBlockStart: "20px" }}>
          <div class="panel-title">{t("dashboard.warnings.title")}</div>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
