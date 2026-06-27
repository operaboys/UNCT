/**
 * App entry point (ADR-014's Build Pipeline, now serving a real screen).
 * Renders the Converter Screen (doc 07 §4.2) — the first real Phase 9
 * screen, built on `ui/store/`'s Preact bridge (ADR-015) over
 * `core/store/`'s Parser State. Rule 11 direction only: `ui/` may import
 * `core/`; `core/` never imports `ui/` or Preact.
 */
import { render } from "preact";
import { ConverterScreen } from "./converter/converter-screen.js";

render(<ConverterScreen />, document.getElementById("app")!);
