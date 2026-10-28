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
 *   1. probe the upstream with the client's exact path and headers;
 *   2. if it answers 401, append `?token=...` and forward the client's request
 *      instead — DSH then mints the cookie and 303-redirects to `./`, so the
 *      browser lands on the app and keeps the cookie for every later request;
 *   3. any other status means the request was fine, so it is forwarded as-is.
 *
 * Only the index request qualifies. DSH accepts the launch token at exactly
 * `GET /` (its `authorizeIndex` requires `pathname === "/"` and a single
 * `token`), so on any other path the token could not mint a cookie even if we
 * sent it — and it would leak the token into URLs, logs, and upstream access
 * records for nothing. Every other request therefore flows through untouched,
 * exactly as it would with the feature off.
 *
 * The decision is made by ASKING THE UPSTREAM, never by guessing from the
 * headers a client happens to carry. An earlier version skipped the probe when
 * the request had any `dsh-auth-*` cookie, treating "carries a session cookie"
 * as "carries a valid session". That is false: DSH's cookie is named
 * `dsh-auth-<base64url(sha256(authority))>` — a name that changes with the
 * upstream port — and its value expires after `cookieMaxAgeDays` or stops
 * verifying when the signing record changes. A browser holding any such cookie
 * (a stale one from an earlier upstream port, an expired one, one signed by a
 * different Harness home) was then declared authenticated, never re-exchanged,
 * and every reload answered `dsh web authentication required` — a permanent
 * lockout that the feature could not recover from, because the cookie it was
 * keyed on is exactly what kept the exchange from happening.
 *
 * WHY A PROBE INSTEAD OF RETRYING IN `proxyRes`: http-proxy 1.18 emits
 * `proxyRes` BEFORE it copies the upstream status/headers onto `res` and pipes
 * the body. A retry issued from that handler would still ship the 401 to the
 * browser and then write a second response over a finished socket. Probing puts
 * the whole decision on the proxy's side of the wire, where nothing has been
 * sent to the client yet. The probe is one body-less GET per index request, so
 * the guess-free rule costs almost nothing.
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
import http from 'node:http';
export interface LaunchTokenAutoLoginOptions {
    /** Upstream DSH bind host. */
    upstreamHost: string;
    /** Upstream DSH port. */
    upstreamPort: number;
    /** The host's launch token; undefined/empty disables the feature. */
    launchToken?: string;
    /** Log sink. */
    log?: (level: 'info' | 'warn' | 'error', message: string) => void;
}
/**
 * Per-proxy launch-token auto-login.
 *
 * One instance owns the upstream coordinates and the token for a single proxy;
 * `enabled` is read once per request to keep the hot path allocation-free.
 */
export declare class LaunchTokenAutoLogin {
    private readonly target;
    private readonly token;
    private readonly log;
    constructor(options: LaunchTokenAutoLoginOptions);
    /** True when a token was supplied and the feature can act. */
    get enabled(): boolean;
    /**
     * Authenticate one client request with the launch token if it needs it.
     *
     * Mutates `req.url` in place when the token should ride along, then lets the
     * caller forward as usual. Only the index GET is considered, and the decision
     * comes from the upstream's answer — never from the headers the client
     * carries. Every other case (feature off, non-index request, token already
     * present, upstream unreachable, upstream accepted the request) falls through
     * to a plain forward, so the request is handled exactly as it would be
     * without this feature.
     */
    grant(req: http.IncomingMessage): Promise<void>;
}
