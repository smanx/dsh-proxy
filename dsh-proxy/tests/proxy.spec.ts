import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import http from 'node:http'
import zlib from 'node:zlib'
import type { AddressInfo } from 'node:net'
import WebSocket, { WebSocketServer } from 'ws'
import { startLanProxy, type LanProxyHandle } from '../src/proxy.ts'
import { RANDOM_UUID_POLYFILL } from '../src/polyfill.ts'

const USER = 'admin'
const PASS = 's3cret'
const UPSTREAM_TOKEN = 'upstream-launch-token'
const UPSTREAM_HTML =
  '<!doctype html><html><head><title>up</title></head><body>UPSTREAM_MARKER</body></html>'
const CONNECTION_NEEDLE =
  'isLoopback: transport?.ownsHost === true || pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),'

const basic = (username = USER, password = PASS): string =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

/** Raw node HTTP GET that returns the exact wire bytes (no auto-decompression). */
function rawGet(path: string, extraHeaders: Record<string, string> = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: world.proxyPort, path, headers: { 'accept-encoding': '', ...extraHeaders } },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }),
        )
      },
    )
    req.on('error', reject)
    req.end()
  })
}

interface World {
  upstreamPort: number
  proxy: LanProxyHandle
  proxyPort: number
  targetOrigin: string
  seen: { host?: string; origin?: string; rootUrls: string[] }
}

let world: World
let upstream: http.Server
let cleanup: (() => Promise<void>)[]

beforeEach(async () => {
  cleanup = []
  const seen: World['seen'] = { rootUrls: [] }

  upstream = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://up').pathname
    if (pathname === '/') seen.rootUrls.push(req.url ?? '/')
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
    if (pathname === '/plugins/x/client.js') {
      // Served in two chunks to prove the JS patch buffers across chunks.
      const code = `const a=1;${CONNECTION_NEEDLE}\nconst b=2;`
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      res.write(code.slice(0, 20))
      res.end(code.slice(20))
      return
    }
    if (pathname === '/plugins/x/client.js.zipped') {
      // Compressed JS: the loopback-trust patch must still apply after
      // decompressing by Content-Encoding.
      const code = `const a=1;${CONNECTION_NEEDLE}\nconst b=2;`
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'content-encoding': 'gzip' })
      res.end(zlib.gzipSync(code))
      return
    }
    if (pathname === '/zipped') {
      // Compressed HTML: the randomUUID polyfill must still be injected.
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'gzip' })
      res.end(zlib.gzipSync(UPSTREAM_HTML))
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
    upstreamToken: UPSTREAM_TOKEN,
    username: USER,
    password: PASS,
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

describe('auth gate (native Basic Auth)', () => {
  it('challenges every unauthenticated request with Basic auth', async () => {
    const nav = await fetch(`${base()}/`, { redirect: 'manual', headers: { accept: 'text/html' } })
    expect(nav.status).toBe(401)
    expect(nav.headers.get('www-authenticate')).toMatch(/^Basic realm=/)

    const api = await fetch(`${base()}/api/state`, { redirect: 'manual' })
    expect(api.status).toBe(401)
    expect(api.headers.get('www-authenticate')).toMatch(/^Basic realm=/)
  })

  it('accepts a valid Basic Authorization header and serves the app', async () => {
    const res = await fetch(`${base()}/`, { headers: { authorization: basic() } })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('UPSTREAM_MARKER')
    expect(html).toContain(RANDOM_UUID_POLYFILL)
    expect(html.indexOf(RANDOM_UUID_POLYFILL)).toBeLessThan(html.indexOf('<title'))
  })

  it('injects the DSH launch token only until the browser has a DSH session cookie', async () => {
    await fetch(`${base()}/`, { headers: { authorization: basic() } })
    await fetch(`${base()}/`, {
      headers: { authorization: basic(), cookie: 'dsh-auth-fixture=session' },
    })

    expect(world.seen.rootUrls).toEqual([`/?token=${UPSTREAM_TOKEN}`, '/'])
  })

  it('rejects a wrong Basic header', async () => {
    const res = await fetch(`${base()}/`, {
      headers: { authorization: basic('admin', 'wrong'), accept: 'text/html' },
      redirect: 'manual',
    })
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic realm=/)
  })
})

describe('upstream header alignment', () => {
  it('rewrites Host and aligns Origin to the upstream loopback authority', async () => {
    // Simulate a LAN browser: the page origin differs from the upstream.
    const res = await fetch(`${base()}/api/state`, {
      headers: { authorization: basic(), origin: 'http://192.168.1.50:3081' },
    })
    expect(res.status).toBe(200)
    expect(world.seen.host).toBe(`127.0.0.1:${world.upstreamPort}`)
    expect(world.seen.origin).toBe(world.targetOrigin)
  })

  it('passes requests without an Origin header (non-browser clients)', async () => {
    const res = await fetch(`${base()}/api/state`, { headers: { authorization: basic() } })
    expect(res.status).toBe(200)
    expect(world.seen.host).toBe(`127.0.0.1:${world.upstreamPort}`)
  })

  it('forwards POST bodies unchanged', async () => {
    const res = await fetch(`${base()}/api/echo`, {
      method: 'POST',
      headers: { authorization: basic(), 'content-type': 'application/json' },
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
    const res = await fetch(`${base()}/favicon.svg`, { headers: { authorization: basic() } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(await res.text()).not.toContain('randomUUID')
  })

  it('rewrites served JavaScript to host-trust while Basic Auth enforces', async () => {
    const res = await fetch(`${base()}/plugins/x/client.js`, { headers: { authorization: basic() } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/javascript')
    const code = await res.text()
    expect(code).not.toContain('isLoopbackHostname')
    expect(code).toContain('isLoopback: true,')
    // The rewritten body must stay valid around the patch point.
    expect(code).toBe('const a=1;isLoopback: true,\nconst b=2;')
  })

  it('injects the HTML polyfill into gzip-compressed HTML', async () => {
    const res = await rawGet('/zipped', { authorization: basic() })
    expect(res.status).toBe(200)
    // Still served gzip-compressed on the wire after the recompress pass.
    expect(res.headers['content-encoding']).toBe('gzip')
    const html = zlib.gunzipSync(res.body).toString('utf8')
    expect(html).toContain('UPSTREAM_MARKER')
    expect(html).toContain(RANDOM_UUID_POLYFILL)
  })

  it('applies the JavaScript loopback-trust patch to gzip-compressed scripts', async () => {
    const res = await rawGet('/plugins/x/client.js.zipped', { authorization: basic() })
    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    const code = zlib.gunzipSync(res.body).toString('utf8')
    expect(code).toContain('isLoopback: true,')
    expect(code).not.toContain(CONNECTION_NEEDLE)
    expect(code).toBe('const a=1;isLoopback: true,\nconst b=2;')
  })

  it('applies the same JavaScript patch with password login off', async () => {
    // The compatibility fixes are unconditional: with credentials empty the
    // surface is open either way, and withholding only this alignment would
    // leave settings degraded while every other RPC stayed reachable.
    const openProxy = startLanProxy({
      listenHost: '127.0.0.1',
      listenPort: 0,
      upstreamHost: '127.0.0.1',
      upstreamPort: world.upstreamPort,
      username: '',
      password: '',
    })
    cleanup.splice(0, 0, () => openProxy.close())
    const port = await openProxy.ready
    const res = await fetch(`http://127.0.0.1:${port}/plugins/x/client.js`)
    expect(res.status).toBe(200)
    const code = await res.text()
    expect(code).not.toContain(CONNECTION_NEEDLE)
    expect(code).toBe('const a=1;isLoopback: true,\nconst b=2;')
  })
})

describe('websocket', () => {
  it('opens a socket with a Basic Authorization header and echoes messages', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${world.proxyPort}/api/events.mux`, {
      headers: { authorization: basic(), origin: 'http://192.168.1.50:3081' },
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

  it('rejects anonymous upgrades with 401 and a Basic challenge', async () => {
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
