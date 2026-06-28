/**
 * Minimal static file server for `playwright.config.js`'s `webServer` —
 * the app is Zero-Build/static (Deployment Mode 1), so E2E tests need
 * nothing more than something to serve the repo root over `http://` (the
 * Clipboard API used by Clipboard Import requires a secure context;
 * `file://` and plain `http://` to a non-localhost host do not qualify,
 * but `http://localhost` does).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const port = Number(process.env.PORT) || 4173;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = join(root, urlPath === "/" ? "/index.html" : urlPath);
  try {
    const data = await readFile(filePath);
    res.setHeader("Content-Type", MIME_TYPES[extname(filePath)] ?? "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Static server listening on http://localhost:${port}`);
});
