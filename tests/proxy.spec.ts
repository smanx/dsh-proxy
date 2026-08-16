import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import WebSocket, { WebSocketServer } from 'ws'
import { startLanProxy, type LanProxyHandle } from '../src/proxy.ts'
import { RANDOM_UUID_POLYFILL } from '../src/polyfill.ts'

const USER = 'admin'
const PASS = 's3cret'
const UPSTREAM_HTML =
  '<!doctype html><html><head><title>up</title></head><body>UPSTREAM_MARKER</body></html>'

interface World {
  upstreamPort: number
  proxy: LanProxyHandle
  proxyPort: number
  targetOrigin: string
  seen: { host?: string; origin?: string }
}

let world: World
let upstream: http.Server
let cleanup: (() => Promise<void>)[]

beforeEach(async () => {
  cleanup = []
  const seen: World['seen'] = {}

  upstream = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://up').pathname
    if (pathname === '/api/state') {
      seen.host = req.headers.host
      seen.origin = req.headers.origin
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }
    if (pathname === '/favicon.svg') {
      res.writeHead(200, { 'content-type': 'image/svg+xml' })
      res.end('<svg xmlns="http://www.w3.org/2000/svg"/>')
      return
    }
    if (pathname === '/api/echo') {
      let body = ''
      req.on('data', (c: Buffer) => (body += c.toString('utf8')))
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ echoed: body, host: req.headers.host, origin: req.headers.origin }))
      })
      return
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(UPSTREAM_HTML)
  })
  const wss = new WebSocketServer({ server: upstream })
  wss.on('connection', (socket) => {
    socket.on('message', (data) => socket.send(`echo:${String(data)}`))
  })

  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  const upstreamPort = (upstream.address() as AddressInfo).port
  const proxy = startLanProxy({
    listenHost: '127.0.0.1',
    listenPort: 0,
    upstreamHost: '127.0.0.1',
    upstreamPort,
    username: USER,
    password: PASS,
    sessionTtlSeconds: 3600,
  })
  const proxyPort = await proxy.ready
  world = { upstreamPort, proxy, proxyPort, targetOrigin: `http://127.0.0.1:${upstreamPort}`, seen }
  cleanup = [
    () => proxy.close(),
    () =>
      new Promise<void>((resolve) => {
        upstream.closeAllConnections()
        upstream.close(() => resolve())
      }),
  ]
})

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose()
})

const base = (): string => `http://127.0.0.1:${world.proxyPort}`

const loginCookie = async (): Promise<string> => {
  const res = await fetch(`${base()}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `username=${USER}&password=${PASS}`,
    redirect: 'manual',
  })
  expect(res.status).toBe(302)
  const setCookie = res.headers.get('set-cookie') ?? ''
  const cookie = setCookie.split(';')[0]
  expect(cookie).toMatch(/^dsh_lan_session=/)
  return cookie
}

describe('auth gate', () => {
  it('redirects anonymous HTML navigations to the login page', async () => {
    const res = await fetch(`${base()}/`, { redirect: 'manual', headers: { accept: 'text/html' } })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('answers anonymous /api requests with 401 JSON and a Basic challenge', async () => {
    const res = await fetch(`${base()}/api/state`, { redirect: 'manual' })
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic realm=/)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('serves the login page', async () => {
    const res = await fetch(`${base()}/login`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('name="username"')
  })

  it('rejects a wrong password and never sets a session', async () => {
    const res = await fetch(`${base()}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=wrong',
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login?error=1')
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('logs in, serves the app with a session cookie, and logs out', async () => {
    const cookie = await loginCookie()

    const app = await fetch(`${base()}/`, { headers: { cookie } })
    expect(app.status).toBe(200)
    const html = await app.text()
    expect(html).toContain('UPSTREAM_MARKER')
    expect(html).toContain(RANDOM_UUID_POLYFILL)
    expect(html.indexOf(RANDOM_UUID_POLYFILL)).toBeLessThan(html.indexOf('<title'))

    const state = await fetch(`${base()}/api/state`, { headers: { cookie } })
    expect(state.status).toBe(200)
    expect(await state.json()).toEqual({ ok: true })

    const logout = await fetch(`${base()}/logout`, { headers: { cookie }, redirect: 'manual' })
    expect(logout.status).toBe(302)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')

    // The browser drops the cookie (Max-Age=0); a follow-up navigation
    // carries no session and is redirected to the login page again. The
    // stateless token itself stays valid until expiry — logout is client-side
    // by design.
    const after = await fetch(`${base()}/`, { headers: { accept: 'text/html' }, redirect: 'manual' })
    expect(after.status).toBe(302)
    expect(after.headers.get('location')).toBe('/login')
  })

  it('accepts Basic Auth as a fallback', async () => {
    const authorization = `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}`
    const res = await fetch(`${base()}/`, { headers: { authorization } })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('UPSTREAM_MARKER')
  })
})

describe('upstream header alignment', () => {
  it('rewrites Host and aligns Origin to the upstream loopback authority', async () => {
    const cookie = await loginCookie()
    // Simulate a LAN browser: the page origin differs from the upstream.
    const res = await fetch(`${base()}/api/state`, {
      headers: { cookie, origin: 'http://192.168.1.50:3081' },
    })
    expect(res.status).toBe(200)
    expect(world.seen.host).toBe(`127.0.0.1:${world.upstreamPort}`)
    expect(world.seen.origin).toBe(world.targetOrigin)
  })

  it('passes requests without an Origin header (non-browser clients)', async () => {
    const authorization = `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}`
    const res = await fetch(`${base()}/api/state`, { headers: { authorization } })
    expect(res.status).toBe(200)
    expect(world.seen.host).toBe(`127.0.0.1:${world.upstreamPort}`)
  })

  it('forwards POST bodies unchanged', async () => {
    const cookie = await loginCookie()
    const res = await fetch(`${base()}/api/echo`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ n: 42 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { echoed: string; host: string; origin: string }
    expect(JSON.parse(body.echoed)).toEqual({ n: 42 })
    expect(body.host).toBe(`127.0.0.1:${world.upstreamPort}`)
  })
})

describe('content handling', () => {
  it('serves public static files (manifest, favicon) without authentication', async () => {
    const manifest = await fetch(`${base()}/manifest.webmanifest`, { redirect: 'manual' })
    expect(manifest.status).toBe(200)
    const favicon = await fetch(`${base()}/favicon.svg`, { redirect: 'manual' })
    expect(favicon.status).toBe(200)
  })

  it('does not inject the polyfill into non-HTML responses', async () => {
    const cookie = await loginCookie()
    const res = await fetch(`${base()}/favicon.svg`, { headers: { cookie } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(await res.text()).not.toContain('randomUUID')
  })
})

describe('websocket', () => {
  it('opens a socket with a session cookie and echoes messages', async () => {
    const cookie = await loginCookie()
    const ws = new WebSocket(`ws://127.0.0.1:${world.proxyPort}/api/events.mux`, {
      headers: { cookie, origin: 'http://192.168.1.50:3081' },
    })
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve)
      ws.once('error', reject)
    })
    const reply = await new Promise<string>((resolve, reject) => {
      ws.once('message', (data) => resolve(String(data)))
      ws.send('ping')
      setTimeout(() => reject(new Error('no reply')), 5000)
    })
    expect(reply).toBe('echo:ping')
    ws.close()
  })

  it('rejects anonymous upgrades with 401', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${world.proxyPort}/api/events.mux`)
      ws.on('unexpected-response', (_req, res) => {
        resolve(res.statusCode ?? 0)
        ws.terminate()
      })
      ws.on('open', () => reject(new Error('should not open')))
      ws.on('error', () => { /* unexpected-response path */ })
    })
    expect(status).toBe(401)
  })
})
