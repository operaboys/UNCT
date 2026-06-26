/**
 * Phase 9 Build Pipeline smoke proof (ADR-014) — not a real screen. Proves
 * the whole chain works end to end: TSX -> esbuild bundle -> classic script
 * -> opened via file:// with zero CORS errors -> Preact renders -> a real
 * `core/` module (not a mock) is called from `ui/`. Rule 11 direction only:
 * `ui/` may import `core/`; `core/` never imports `ui/` or Preact.
 */
import { render } from "preact";
import { useState } from "preact/hooks";
import { createNode } from "../core/unm/index.js";
import { validateNode } from "../core/validator/index.js";

function App() {
  const [report] = useState(() => {
    const node = createNode({
      sourceType: "vless-url",
      protocol: "vless",
      address: "example.com",
      port: 443,
      uuid: "1c1ad657-32e6-4f6c-b93e-5f2e9b5f6c1a",
    });
    const { validation } = validateNode(node);
    return { nodeId: node.nodeId, overallValid: validation.overallValid };
  });

  return (
    <main>
      <h1>UNCT — Build Pipeline Smoke Proof</h1>
      <p>nodeId: {report.nodeId}</p>
      <p>overallValid: {String(report.overallValid)}</p>
    </main>
  );
}

render(<App />, document.getElementById("app")!);
