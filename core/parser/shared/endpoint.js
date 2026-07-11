/**
 * Endpoint helper — split a `host:port` string (IPv6-aware) shared across
 * parsers that receive a combined endpoint (WireGuard now). Single source of
 * truth so no parser re-implements the split.
 */

/**
 * @param {unknown} hostPort  e.g. "example.com:443", "[2001:db8::1]:51820"
 * @returns {{ host: string, port: number | undefined } | null}
 */
export function splitHostPort(hostPort) {
  if (typeof hostPort !== "string" || hostPort.length === 0) return null;
  const v6 = /^\[([^\]]+)\]:(\d+)$/.exec(hostPort);
  if (v6) return { host: v6[1], port: Number(v6[2]) };
  const idx = hostPort.lastIndexOf(":");
  if (idx < 0) return { host: hostPort, port: undefined };
  const portStr = hostPort.slice(idx + 1);
  return { host: hostPort.slice(0, idx), port: /^\d+$/.test(portStr) ? Number(portStr) : undefined };
}
