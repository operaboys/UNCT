/**
 * Export Engine barrel (08-EXPORT_ENGINE, ADR-004). Re-exports every format
 * built so far — TXT/JSON/CSV/YAML (built directly on the existing Converter
 * Engine, core/converter/), ZIP (ADR-017, bundling those same formats plus a
 * manifest.json via `fflate`), QR (ADR-017, raw matrix via `uqr`), HTML
 * Report (ADR-018, escaped+sanitized via `dompurify`), Portable Package
 * (P12-4, round-trip backup/snapshot via `fflate`), and Markdown/PDF/Excel
 * (P12-3, ADR-023: zero-dep Markdown+PDF, write-excel-file for XLSX).
 */
export { exportTxt } from "./to-txt.js";
export { exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson } from "./to-json.js";
export { exportClashYaml } from "./to-yaml.js";
export { exportCsv } from "./to-csv.js";
export { exportZip } from "./to-zip.js";
export { exportQr } from "./to-qr.js";
export { exportHtmlReport } from "./to-html.js";
export { exportPortablePackage, importPortablePackage, PORTABLE_PACKAGE_VERSION } from "./portable-package.js";
export { exportMarkdown } from "./to-markdown.js";
export { exportPdf } from "./to-pdf.js";
export { exportExcel } from "./to-excel.js";
