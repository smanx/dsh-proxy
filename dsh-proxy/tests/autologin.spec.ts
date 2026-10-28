import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { startLanProxy, type LanProxyHandle } from '../src/proxy.ts'

/**
 * End-to-end auto-login against a faithful copy of the harness browser-auth gate.
 *
 * The gate replicates `BrowserAuth.authorizeIndex` / `authenticate` from
 * `@deepseek-ai/dsh-client-connection` (verified against 0.1.7-rc.2 and
 * 0.2.0-rc.2 / 0.2.1-rc.2, and cross-checked live against a running `dsh web`):
 *
 *   - the session cookie is named `dsh-auth-<base64url(sha256(authority))>`,
 *     where `authority` is the Host header the upstream actually receives;
 *   - a launch token is accepted ONLY on `GET /` with exactly one `token`
 *     param, and then answers 303 + `Set-Cookie` + `Location: ./`;
 *   - a token on any other path, or no credential at all, is the same minimal
 *     401 whose body is `dsh web authentication required; reopen the URL
 *     printed by dsh web.`
 *
 * Why a replica instead of the harness class: `BrowserAuth` is not exported
 * (`@deepseek-ai/dsh-client-connection` exports the cordis plugin, the service,
 * and the wire schemas only). The replica is pinned to the same arithmetic — the
 * tests below assert the cookie NAME is derived exactly as the harness derives
 * it, so a divergence in the harness is caught by the derivation, not by a
 * hand-written name.
 */
const TOKEN = 'launch-token-abc123'
const SECRET = crypto.randomBytes(32)
const UNAUTHENTICATED = 'dsh web authentication required; reopen the URL printed by dsh web.\n'
const INDEX_HTML = '<!doctype html><html><body>AUTOLOGIN_MARKER</body></html>'

/** The harness's own name derivation: prefix + base64url(sha256(authority)). */
function cookieName(authority: string): string {
  const digest = crypto.createHash('sha256').update(authority).digest()
  return `dsh-auth-${digest.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')}`
}

/** Sign a payload the way the harness does: `v1.<body>.<hmac(body)>`. */
function encodeCookie(payload: { authority: string; issuedAt: number; expiresAt: number }): string {
  const body = Buffer.from(JSON.stringify({ version: 1, ...payload }), 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest()
    .toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
  return `v1.${body}.${sig}`
}

/** Read one named cookie out of a Cookie header value. */
function readCookie(header: string | undefined, name: string): string | undefined {
  for (const segment of (header ?? '').split(';')) {
    const at = segment.indexOf('=')
    if (at === -1 || segment.slice(0, at).trim() !== name) continue
    return segment.slice(at + 1).trim()
  }
}

/** The authority an upstream request carries, exactly as the harness derives it. */
function authorityOf(req: http.IncomingMessage): string {
  return new URL(`http://${req.headers.host ?? ''}`).host
}

/** True only for an unexpired cookie of THIS authority, signed by SECRET. */
function isAuthenticated(req: http.IncomingMessage): boolean {
  const authority = authorityOf(req)
  const value = readCookie(req.headers.cookie, cookieName(authority))
  if (value === undefined) return false
  const [version, body, sig] = value.split('.')
  if (version !== 'v1' || body === undefined || sig === undefined) return false
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest()
  const actual = Buffer.from(sig.replaceAll('-', '+').replaceAll('_', '/'), 'base64')
  if (actual.byteLength !== expected.byteLength || !crypto.timingSafeEqual(actual, expected)) return false
  const decoded = JSON.parse(
    Buffer.from(body.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'),
  ) as { authority?: string; issuedAt?: number; expiresAt?: number }
  const now = Date.now()
  return decoded.authority === authority
    && typeof decoded.issuedAt === 'number' && decoded.issuedAt <= now
    && typeof decoded.expiresAt === 'number' && decoded.expiresAt > now
}

interface Gate {
  server: http.Server
  port: number
  /** Every path the upstream actually served, with the authority it saw. */
  seen: { path: string; authority: string }[]
  close(): Promise<void>
}

/** Mount the replicated harness gate on an ephemeral loopback port. */
async function harnessGate(): Promise<Gate> {
  const seen: Gate['seen'] = []
  const unauthorized = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    res.writeHead(401, { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' })
    res.end(req.method === 'HEAD' ? void 0 : UNAUTHENTICATED)
  }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://dsh.invalid')
    seen.push({ path: `${url.pathname}${url.search}`, authority: authorityOf(req) })
    const tokens = url.searchParams.getAll('token')

    if (url.pathname === '/') {
      if (tokens.length > 0) {
        // The exchange branch: only a single, correct token on `GET /` mints a cookie.
        if (req.method === 'GET' && tokens.length === 1 && tokens.join('') === TOKEN) {
          const authority = authorityOf(req)
          const issuedAt = Date.now()
          const expiresAt = issuedAt + 30 * 86_400_000
          res.writeHead(303, {
            'cache-control': 'no-store',
            location: './',
            'set-cookie': `${cookieName(authority)}=${encodeCookie({ authority, issuedAt, expiresAt })}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Strict`,
          })
          res.end()
          return
        }
        unauthorized(req, res)
        return
      }
      if (isAuthenticated(req)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(INDEX_HTML)
        return
      }
      unauthorized(req, res)
      return
    }

    // Every other route: cookie or nothing — a token there is not a credential.
    if (isAuthenticated(req)) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ authority: authorityOf(req) }))
      return
    }
    unauthorized(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  return {
    server,
    port,
    seen,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

/** A cookie jar the size of one browser tab: send what the upstream handed back. */
class Jar {
  private readonly store = new Map<string, string>()
  load(setCookie: string | null): void {
    if (setCookie === null) return
    const [pair] = setCookie.split(';')
    const at = (pair as string).indexOf('=')
    this.store.set((pair as string).slice(0, at).trim(), (pair as string).slice(at + 1).trim())
  }
  /** Add a cookie the browser already holds from some earlier visit. */
  plant(name: string, value: string): void {
    this.store.set(name, value)
  }
  /** The cookie names a browser would send, for assertions. */
  names(): string[] {
    return [...this.store.keys()]
  }
  header(): Record<string, string> {
    if (this.store.size === 0) return {}
    return { cookie: [...this.store].map(([k, v]) => `${k}=${v}`).join('; ') }
  }
}

const PROBE_TIMEOUT_MS = 20_000
let gate: Gate
let proxy: LanProxyHandle
let proxyPort: number
let cleanup: (() => Promise<void>)[]

async function openViaProxy(path: string, jar: Jar, headers: Record<string, string> = {}): Promise<{
  status: number
  setCookie: string | null
  location: string | null
  body: string
}> {
  const res = await withTimeout(
    fetch(`http://127.0.0.1:${proxyPort}${path}`, {
      redirect: 'manual',
      headers: { ...jar.header(), ...headers },
    }),
  )
  return {
    status: res.status,
    setCookie: res.headers.get('set-cookie'),
    location: res.headers.get('location'),
    body: await res.text(),
  }
}

/** A hanging proxy request must fail the test, not the whole suite run. */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`request timed out after ${PROBE_TIMEOUT_MS}ms`)), PROBE_TIMEOUT_MS)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** Follow the 303 → `./` chain the way a browser does, feeding the jar. */
async function navigate(path: string, jar: Jar): Promise<{ status: number; body: string }> {
  let next = path
  for (let hop = 0; hop < 5; hop += 1) {
    const res = await openViaProxy(next, jar)
    jar.load(res.setCookie)
    if (res.status !== 303 && res.status !== 302) return { status: res.status, body: res.body }
    next = new URL(res.location ?? './', `http://127.0.0.1:${proxyPort}${next}`).pathname
  }
  throw new Error('too many redirects')
}

async function withProxy(launchToken?: string): Promise<void> {
  proxy = startLanProxy({
    listenHost: '127.0.0.1',
    listenPort: 0,
    upstreamHost: '127.0.0.1',
    upstreamPort: gate.port,
    username: '',
    password: '',
    launchToken,
  })
  proxyPort = await proxy.ready
  cleanup.push(() => proxy.close())
}

beforeEach(async () => {
  cleanup = []
  gate = await harnessGate()
})

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose()
  await gate.close()
})

describe('launch-token auto-login through the proxy', () => {
  it('exchanges the token for a cookie on a first visit, then serves the app', async () => {
    await withProxy(TOKEN)
    const jar = new Jar()
    const page = await navigate('/', jar)

    expect(page.status).toBe(200)
    expect(page.body).toContain('AUTOLOGIN_MARKER')
    // The cookie the browser ends up holding is the one the harness accepts.
    expect(jar.names()).toContain(cookieName(`127.0.0.1:${gate.port}`))
    // And the app's own API calls now pass on the cookie alone.
    const api = await openViaProxy('/api/state', jar)
    expect(api.status).toBe(200)
  })

  it('self-heals a browser that holds a stale session cookie', async () => {
    await withProxy(TOKEN)
    const jar = new Jar()
    // The lockout case: a `dsh-auth-*` cookie the upstream will not accept —
    // here one named for a different upstream authority (e.g. the port this
    // proxy forwarded to before). The proxy used to treat ANY such cookie as a
    // credential, skip the exchange, and 401 forever.
    jar.plant(cookieName('127.0.0.1:9999'), 'v1.Zm9v.YmFy')

    const page = await navigate('/', jar)
    expect(page.status).toBe(200)
    expect(page.body).toContain('AUTOLOGIN_MARKER')

    const api = await openViaProxy('/api/state', jar)
    expect(api.status).toBe(200)
  })

  it('self-heals an expired cookie of the correct name', async () => {
    await withProxy(TOKEN)
    const jar = new Jar()
    // Right name, signed by the harness secret, but already expired.
    const authority = `127.0.0.1:${gate.port}`
    const past = Date.now() - 1000
    jar.plant(cookieName(authority), encodeCookie({ authority, issuedAt: past - 5000, expiresAt: past }))

    const page = await navigate('/', jar)
    expect(page.status).toBe(200)
  })

  it('never sends the launch token on a request that does not need it', async () => {
    await withProxy(TOKEN)
    const jar = new Jar()
    await navigate('/', jar)
    gate.seen.length = 0

    // A warm session: the index plus one API call. The index costs one probe and
    // one forward; the API path is neither probed nor given a token, because a
    // token there could not mint a cookie and would only leak it into a URL.
    expect((await openViaProxy('/', jar)).status).toBe(200)
    expect((await openViaProxy('/api/state', jar)).status).toBe(200)
    const paths = gate.seen.map((entry) => entry.path)
    expect(paths.filter((path) => path.includes('token='))).toEqual([])
    expect(paths).toEqual(['/', '/', '/api/state'])
  })

  it('leaves the 401 in place when the feature is off', async () => {
    await withProxy(undefined)
    const jar = new Jar()
    jar.plant(cookieName('127.0.0.1:9999'), 'v1.Zm9v.YmFy')
    const res = await openViaProxy('/', jar)
    expect(res.status).toBe(401)
    expect(res.body).toContain('dsh web authentication required')
  })

  it('does not append a second token when the client already carries one', async () => {
    await withProxy(TOKEN)
    const jar = new Jar()
    // The startup URL a human pastes: `/?token=...`. Doubling the param would
    // make the harness reject the request outright.
    const res = await openViaProxy(`/?token=${TOKEN}`, jar)
    expect(res.status).toBe(303)
    jar.load(res.setCookie)
    expect((await openViaProxy('/', jar)).status).toBe(200)
    expect(gate.seen.filter((entry) => entry.path.includes('token=')).length).toBe(1)
  })
})
