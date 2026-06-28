/**
 * App entry point (ADR-014's Build Pipeline). Renders Phase 9's real
 * screens behind a minimal, dependency-free screen switcher — plain Preact
 * state, not a router library (adding one would be a new 14-DEPENDENCY_
 * POLICY decision, out of scope for wiring up the second screen). Rule 11
 * direction only: `ui/` may import `core/`; `core/` never imports `ui/` or
 * Preact.
 */
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DashboardScreen } from "./dashboard/dashboard-screen.js";
import { ConverterScreen } from "./converter/converter-screen.js";
import { AnalyzerScreen } from "./analyzer/analyzer-screen.js";
import { SubscriptionScreen } from "./subscription/subscription-screen.js";
import { ExtractorScreen } from "./extractor/extractor-screen.js";
import { ExportScreen } from "./export/export-screen.js";
import { SettingsScreen } from "./settings/settings-screen.js";
import { DevConsoleScreen } from "./devconsole/devconsole-screen.js";
import { useSettingsState } from "./store/use-settings-state.js";
import { parserStore } from "./store/use-parser-state.js";

type Screen =
  | "dashboard" | "converter" | "analyzer" | "subscription" | "extractor"
  | "export" | "settings" | "devconsole";

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");

  // Theme Engine (07-UI_UX_SYSTEM §2): applied app-wide here, not inside
  // SettingsScreen itself, so it stays in effect (and live-syncs with the OS
  // under "auto") regardless of which screen is currently mounted.
  const { resolvedTheme } = useSettingsState();
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  // Critical Fix #3: every parserStore mutation already write-throughs to
  // core/storage/ in the background — this is the read-side counterpart,
  // loading whatever was persisted in a prior session once on mount instead
  // of starting empty (closes 09-ROADMAP Phase 8's "persist after browser
  // restart" Exit Condition).
  useEffect(() => {
    parserStore.hydrate();
  }, []);

  return (
    <div>
      <nav aria-label="Screen Switcher">
        <button type="button" onClick={() => setScreen("dashboard")} disabled={screen === "dashboard"}>
          Dashboard
        </button>
        <button type="button" onClick={() => setScreen("converter")} disabled={screen === "converter"}>
          Converter
        </button>
        <button type="button" onClick={() => setScreen("analyzer")} disabled={screen === "analyzer"}>
          Analyzer
        </button>
        <button type="button" onClick={() => setScreen("subscription")} disabled={screen === "subscription"}>
          Subscription Center
        </button>
        <button type="button" onClick={() => setScreen("extractor")} disabled={screen === "extractor"}>
          Extractor
        </button>
        <button type="button" onClick={() => setScreen("export")} disabled={screen === "export"}>
          Export Center
        </button>
        <button type="button" onClick={() => setScreen("settings")} disabled={screen === "settings"}>
          Settings
        </button>
        <button type="button" onClick={() => setScreen("devconsole")} disabled={screen === "devconsole"}>
          Developer Console
        </button>
      </nav>
      {screen === "dashboard" ? (
        <DashboardScreen />
      ) : screen === "converter" ? (
        <ConverterScreen />
      ) : screen === "analyzer" ? (
        <AnalyzerScreen />
      ) : screen === "subscription" ? (
        <SubscriptionScreen />
      ) : screen === "extractor" ? (
        <ExtractorScreen />
      ) : screen === "export" ? (
        <ExportScreen />
      ) : screen === "settings" ? (
        <SettingsScreen />
      ) : (
        <DevConsoleScreen />
      )}
    </div>
  );
}

render(<App />, document.getElementById("app")!);
