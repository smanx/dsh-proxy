import { describe, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { LaunchTokenAutoLogin } from '../src/tokenretry.ts'

/**
 * These tests pin the two failure modes that made the feature silently inert
 * during development, both of which were swallowed by the same try/catch:
 *
 *  1. `'content-length': undefined` in a request-header object makes Node throw
 *     `Invalid value "undefined" for header "content-length"`, so the probe
 *     never reached the upstream and every request fell through as if the
 *     feature were off.
 *  2. Detaching the host method (`const f = ctx.connection.authenticatedUrl`)
 *     loses `this`; the host reads `this.browserAuth` inside and throws.
 *
 * A regression in either shows up here as "no request arrived upstream".
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

  it('skips requests that already carry a DSH session cookie', async () => {
    const { server, port, seen } = await upstream(401)
    const auto = new LaunchTokenAutoLogin({ upstreamHost: '127.0.0.1', upstreamPort: port, launchToken: TOKEN })
    const req = fakeRequest('/', { cookie: 'dsh-auth-ZGFzaA=v1.signed' })
    await auto.grant(req)
    expect(req.url).toBe('/')
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
