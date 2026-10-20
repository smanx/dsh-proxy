/**
 * Launch-token auto-login for the LAN proxy (DSH 0.2.x).
 *
 * WHY THIS EXISTS: the harness gates its whole web surface behind a per-process
 * launch token. A navigation without the token gets `401 dsh web authentication
 * required; reopen the URL printed by dsh web.`, and only `GET /?token=...`
 * converts that token into a signed 30-day cookie. A LAN device therefore needs
 * somebody to read the token off the `dsh web` startup log and paste it into
 * the URL — one manual step per device, repeated after every restart.
 *
 * This module removes that step. The proxy performs the very exchange a browser
 * performs by hand, on the client's behalf, before the client's own request is
 * forwarded:
 *
 *   1. probe the upstream with the client's exact method, path and headers;
 *   2. if it answers 401 and the client carries no credential, append
 *      `?token=...` and forward the client's request instead — DSH then mints
 *      the cookie and 303-redirects to `./`, so the browser lands on the app
 *      and keeps the cookie for every later request;
 *   3. any other status means the request was fine, so it is forwarded as-is.
 *
 * WHY A PROBE INSTEAD OF RETRYING IN `proxyRes`: http-proxy 1.18 emits
 * `proxyRes` BEFORE it copies the upstream status/headers onto `res` and pipes
 * the body. A retry issued from that handler would still ship the 401 to the
 * browser and then write a second response over a finished socket. Probing puts
 * the whole decision on the proxy's side of the wire, where nothing has been
 * sent to the client yet.
 *
 * The token is read from the host Connection service (`ctx.connection
 * .authenticatedUrl()`) — the same value `dsh web` prints at startup. Nothing
 * is minted, guessed or persisted here; when the host cannot supply a token the
 * feature stays inert and the proxy behaves exactly as before.
 *
 * SECURITY: with this enabled, any device that can reach the proxy port is
 * admitted by DSH without knowing the launch token, so the proxy's own Basic
 * Auth gate becomes the only barrier. That is why it defaults to OFF and why
 * the settings page tells the user to pair it with a username and password.
 */
import http from 'node:http'

/** Upstream coordinates, resolved once from the proxy's own options. */
interface AutoLoginTarget {
  host: string
  port: number
}

export interface LaunchTokenAutoLoginOptions {
  /** Upstream DSH bind host. */
  upstreamHost: string
  /** Upstream DSH port. */
  upstreamPort: number
  /** The host's launch token; undefined/empty disables the feature. */
  launchToken?: string
  /** Log sink. */
  log?: (level: 'info' | 'warn' | 'error', message: string) => void
}

/** DSH mints its session cookie under this prefix (authority-suffixed). */
const DSH_COOKIE_PREFIX = 'dsh-auth-'

/**
 * Decide whether a client's request may be upgraded with the launch token.
 *
 * Only GET requests qualify: DSH accepts the token at exactly `GET /`, and
 * replaying a token onto a state-changing request would be both useless (DSH
 * rejects it) and wrong in principle.
 */
function isTokenExchangeCandidate(method: string | undefined): boolean {
  return method === undefined || method === 'GET'
}

/** True when the request already carries a credential, so no exchange is needed. */
function hasCredential(req: http.IncomingMessage): boolean {
  const url = new URL(req.url ?? '/', 'http://dsh-proxy.local')
  if (url.searchParams.has('token')) return true
  // DSH's cookie name is `dsh-auth-<base64url(sha256(authority))>`, so a
  // prefix match is the whole test — the authority suffix is not needed here.
  const cookie = req.headers.cookie
  if (cookie === undefined) return false
  return cookie.split(';').some((entry) => entry.trim().startsWith(`${DSH_COOKIE_PREFIX}`))
}

/** Append `?token=...` to a request URL, preserving any existing query. */
function withToken(url: string, token: string): string {
  const parsed = new URL(url, 'http://dsh-proxy.local')
  parsed.searchParams.set('token', token)
  // Only path+query belongs on the wire; the base was a parsing anchor.
  return `${parsed.pathname}${parsed.search}`
}

/**
 * Send one GET upstream and report only its status code.
 *
 * The response body is drained and discarded — it is never the client's data,
 * it only tells the proxy whether the request would have been accepted.
 * Rejects on transport failure so the caller can fall through to a plain
 * forward (which then reports the real error through the proxy's own handler).
 */
function probeStatus(
  target: AutoLoginTarget,
  path: string,
  headers: http.IncomingHttpHeaders,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: target.host,
        port: target.port,
        path,
        method: 'GET',
        // The probe impersonates the client, so it must present the same Host
        // the forwarded request will — otherwise DSH would evaluate a
        // different authority than the one the real request uses.
        headers,
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * Per-proxy launch-token auto-login.
 *
 * One instance owns the upstream coordinates and the token for a single proxy;
 * `enabled` is read once per request to keep the hot path allocation-free.
 */
export class LaunchTokenAutoLogin {
  private readonly target: AutoLoginTarget
  private readonly token: string
  private readonly log: LaunchTokenAutoLoginOptions['log']

  constructor(options: LaunchTokenAutoLoginOptions) {
    this.target = { host: options.upstreamHost, port: options.upstreamPort }
    this.token = options.launchToken ?? ''
    this.log = options.log
  }

  /** True when a token was supplied and the feature can act. */
  get enabled(): boolean {
    return this.token !== ''
  }

  /**
   * Authenticate one client request with the launch token if it needs it.
   *
   * Mutates `req.url` in place when the token should ride along, then lets the
   * caller forward as usual. Never completes a response itself: every failure
   * mode (no token, non-GET, already credentialed, upstream unreachable,
   * upstream answered) falls through to a plain forward, so the request is
   * handled exactly as it would be without this feature.
   */
  async grant(req: http.IncomingMessage): Promise<void> {
    if (!this.enabled) return
    if (!isTokenExchangeCandidate(req.method)) return
    if (hasCredential(req)) return

    const url = new URL(req.url ?? '/', 'http://dsh-proxy.local')
    // Clone the client's headers so the probe presents the same credentials and
    // negotiation the real request would — but strip the framing headers a
    // body-less GET must not carry, and never answer from a shared cache: the
    // whole point is to observe what THIS client would get right now.
    const browserHeaders: http.IncomingHttpHeaders = { ...req.headers }
    delete browserHeaders['content-length']
    delete browserHeaders['transfer-encoding']
    // The probe is a direct upstream request, so the client's Host (which
    // points at the proxy) must be replaced by the upstream authority — the
    // same one changeOrigin makes for the forwarded request.
    browserHeaders.host = `${this.target.host}:${this.target.port}`
    browserHeaders['cache-control'] = 'no-cache'
    browserHeaders.pragma = 'no-cache'
    let status: number
    try {
      status = await probeStatus(this.target, `${url.pathname}${url.search}`, browserHeaders)
    } catch {
      // Upstream unreachable: stay out of the way and forward normally, so the
      // proxy's own error handler reports the real failure to the client.
      return
    }
    if (status !== 401) return

    this.log?.(
      'info',
      'launch-token auto-login: upstream answered 401, completing the token exchange on the client’s behalf',
    )
    req.url = withToken(req.url ?? '/', this.token)
  }
}
