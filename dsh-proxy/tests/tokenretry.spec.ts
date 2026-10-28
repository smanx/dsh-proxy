import { describe, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { LaunchTokenAutoLogin } from '../src/tokenretry.ts'

/**
 * These tests pin the failure modes that made the feature silently inert, each
 * of which was swallowed by the same try/catch or looked correct on paper:
 *
 *  1. `'content-length': undefined` in a request-header object makes Node throw
 *     `Invalid value "undefined" for header "content-length"`, so the probe
 *     never reached the upstream and every request fell through as if the
 *     feature were off.
 *  2. Detaching the host method (`const f = ctx.connection.authenticatedUrl`)
 *     loses `this`; the host reads `this.browserAuth` inside and throws.
 *  3. Guessing authentication from the client's headers (`any cookie starting
 *     with dsh-auth-` meant "already signed in") meant a stale, expired, or
 *     foreign-named session cookie suppressed the exchange forever — the
 *     lockout the feature exists to remove. The upstream's answer is the only
 *     admissible input, which is also why a token may only ride on `GET /`.
 *
 * A regression in the first two shows up here as "no request arrived upstream".
 */
const TOKEN = 'launch-token-abc123'

/** A recording upstream: answers 401 and logs every request it receives. */
async function upstream(status: number): Promise<{ server: http.Server; port: number; seen: string[] }> {
  const seen: string[] = []
  const server = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url} host=${req.headers.host ?? '-'}`)
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(status === 401 ? 'dsh web authentication required\n' : 'ok')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, port: (server.address() as AddressInfo).port, seen }
}

/** A client request as the proxy sees it (only the fields grant() touches). */
function fakeRequest(url = '/', headers: Record<string, string> = {}): http.IncomingMessage {
  return { method: 'GET', url, headers } as unknown as http.IncomingMessage
}

describe('LaunchTokenAutoLogin', () => {
  it('is disabled without a token', async () => {
    const { server, port } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port })
    expect(auto.enabled).toBe(false)
    await auto.grant(fakeRequest())
    expect(fakeRequest().url).toBe('/')
    server.close()
  })

  it('appends the token when the upstream answers 401', async () => {
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/?tab=chat')
    await auto.grant(req)
    expect(req.url).toBe('/?tab=chat&token=launch-token-abc123')
    // The probe itself must reach the upstream (regression: undefined headers).
    expect(seen).toHaveLength(1)
    expect(seen[0]).toContain('GET /?tab=chat')
    // The probe must present the upstream authority, not the client's Host.
    expect(seen[0]).toContain(`host=127.0.0.1:${port}`)
    server.close()
  })

  it('leaves the URL alone when the upstream accepts the request', async () => {
    const { server, port } = await upstream(200)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/')
    await auto.grant(req)
    expect(req.url).toBe('/')
    server.close()
  })

  it('skips requests that already carry a token', async () => {
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/?token=already-here')
    await auto.grant(req)
    // Appending a second token would make DSH reject the request outright.
    expect(req.url).toBe('/?token=already-here')
    expect(seen).toHaveLength(0)
    server.close()
  })

  it('exchanges again when the client carries a stale DSH session cookie', async () => {
    // The regression this pins: a browser holding ANY `dsh-auth-*` cookie used
    // to be declared authenticated without asking the upstream, so a cookie that
    // DSH does not accept — one named for a different upstream port, an expired
    // one, one signed by another Harness home — was never re-exchanged. Every
    // reload answered 401 and the device was locked out permanently, because the
    // cookie that caused the lockout is what suppressed the only way out.
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/', { cookie: 'dsh-auth-ZGFzaA=v1.signed-but-stale' })
    await auto.grant(req)
    expect(req.url).toBe('/?token=launch-token-abc123')
    expect(seen).toHaveLength(1)
    server.close()
  })

  it('does not probe when the upstream already accepts the client’s cookie', async () => {
    // A valid session costs one probe, not a token: the upstream answers 200, so
    // the request is forwarded exactly as the client sent it.
    const { server, port, seen } = await upstream(200)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/', { cookie: 'dsh-auth-VPhEEcLKeqRDBoBalzN2Nm7CnfxKhLE00pKIDWxt1sw=v1.signed' })
    await auto.grant(req)
    expect(req.url).toBe('/')
    expect(seen).toHaveLength(1)
    server.close()
  })

  it('leaves non-index requests alone', async () => {
    // DSH accepts a token at exactly `GET /`; on any other path it cannot mint a
    // cookie, so the token must not be appended there (it would only leak the
    // launch token into URLs, logs, and upstream access records).
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    for (const path of ['/api/remote.mux', '/assets/app.js', '/session/abc', '/index.html']) {
      const req = fakeRequest(path)
      await auto.grant(req)
      expect(req.url).toBe(path)
    }
    expect(seen).toHaveLength(0)
    server.close()
  })

  it('never touches non-GET requests', async () => {
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = { method: 'POST', url: '/', headers: {} } as unknown as http.IncomingMessage
    await auto.grant(req)
    expect(req.url).toBe('/')
    expect(seen).toHaveLength(0)
    server.close()
  })

  it('falls through when the upstream is unreachable', async () => {
    // Nothing listens on this port: the probe rejects, and the request must be
    // left untouched so the proxy's own error handler reports the failure.
    const dead = http.createServer()
    await new Promise<void>((resolve) => dead.listen(0, '127.0.0.1', resolve))
    const deadPort = (dead.address() as AddressInfo).port
    await new Promise<void>((resolve) => dead.close(() => resolve()))

    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: deadPort, launchToken: TOKEN })
    const req = fakeRequest('/')
    await auto.grant(req)
    expect(req.url).toBe('/')
  })
})
