/**
 * App entry point (ADR-014's Build Pipeline). Renders Phase 9's real
 * screens behind a minimal, dependency-free screen switcher — plain Preact
 * state, not a router library (adding one would be a new 14-DEPENDENCY_
 * POLICY decision, out of scope for wiring up the second screen). Rule 11
 * direction only: `ui/` may import `core/`; `core/` never imports `ui/` or
 * Preact.
 */
import { render } from "preact";
import { useState } from "preact/hooks";
import { DashboardScreen } from "./dashboard/dashboard-screen.js";
import { ConverterScreen } from "./converter/converter-screen.js";
import { AnalyzerScreen } from "./analyzer/analyzer-screen.js";
import { SubscriptionScreen } from "./subscription/subscription-screen.js";
import { ExtractorScreen } from "./extractor/extractor-screen.js";
import { ExportScreen } from "./export/export-screen.js";

type Screen = "dashboard" | "converter" | "analyzer" | "subscription" | "extractor" | "export";

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");

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
      ) : (
        <ExportScreen />
      )}
    </div>
  );
}

render(<App />, document.getElementById("app")!);
