/**
 * Loopback-trust alignment for the proxied DSH frontend: exact-string patches
 * applied to JavaScript responses so the browser treats LAN access through
 * this authenticated proxy as host-trusted.
 *
 * Since dsh 0.1.1 the client gates host-bound settings on
 * `connection.isLoopback`, computed from `location.hostname` in the browser
 * (`dsh-client-connection`): a page served from a LAN IP is "remote", the
 * settings mirror stays process-local ("memory") with a permanent
 * "unavailable" snapshot, and surfaces like the settings Models page fail
 * with "settings are unavailable in this browser". The hostname cannot be
 * spoofed from injected HTML, so the proxy rewrites the served bundle bytes
 * instead — the same class of fix as the randomUUID polyfill, but for
 * JavaScript bodies.
 *
 * Through this proxy the trust claim is honest: every request already passed
 * the Basic Auth gate and rides Host/Origin aligned to the upstream loopback
 * authority, which satisfies the server-side `/api` fence exactly like local
 * access does.
 */

/** One exact-string rewrite applied to every proxied JavaScript body. */
export interface ScriptPatch {
  /** Byte-exact needle searched in the response text (replaceAll semantics). */
  readonly needle: string
  /** Literal replacement text. */
  readonly replacement: string
  /**
   * What breaks without this patch — surfaced in logs when a served script
   * that used to carry the needle no longer matches it.
   */
  readonly purpose: string
}

/**
 * The client bundles are served unminified, so these needles are byte-stable
 * across page loads; they may shift between harness releases, in which case
 * the affected feature degrades to the harness's remote behavior instead of
 * erroring differently than direct LAN access.
 */
export const LOOPBACK_TRUST_PATCHES: readonly ScriptPatch[] = [
  {
    // dsh-client-connection: the one place `connection.isLoopback` is born;
    // forcing true makes every consumer (settings mirror persistence,
    // settings-general document store, deliverables open-file) treat the
    // proxied origin as host-trusted.
    needle:
      'isLoopback: pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),',
    replacement: 'isLoopback: true,',
    purpose: 'connection.isLoopback (settings mirror stays unavailable)',
  },
  {
    // dsh-client-ui-settings: defense in depth — if the connection shape ever
    // changes upstream, the two mirror constructions keep their host mode.
    needle: 'connection.isLoopback ? "host" : "memory"',
    replacement: '"host"',
    purpose: 'settings describe mirror persistence',
  },
]

/** Whether an HTTP response content-type names a JavaScript payload. */
export function isJavaScriptContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('javascript')
}

/**
 * Apply every loopback-trust patch to one JavaScript response body.
 * @param code - the upstream response text.
 * @returns the patched text plus how many needles were found (a plain vendor
 * bundle legitimately matches none).
 */
export function patchClientScript(code: string): { code: string; matched: string[] } {
  let out = code
  const matched: string[] = []
  for (const patch of LOOPBACK_TRUST_PATCHES) {
    if (!out.includes(patch.needle)) continue
    matched.push(patch.purpose)
    out = out.split(patch.needle).join(patch.replacement)
  }
  return { code: out, matched }
}
