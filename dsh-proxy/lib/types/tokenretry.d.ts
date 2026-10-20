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
     * caller forward as usual. Never completes a response itself: every failure
     * mode (no token, non-GET, already credentialed, upstream unreachable,
     * upstream answered) falls through to a plain forward, so the request is
     * handled exactly as it would be without this feature.
     */
    grant(req: http.IncomingMessage): Promise<void>;
}
