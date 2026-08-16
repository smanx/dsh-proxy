/**
 * Live smoke test for dsh-lan-proxy against a RUNNING DSH web app.
 *
 * Starts the bundled proxy (lib/index.js — the same artifact the profile
 * loads) on 127.0.0.1:0, then verifies the full LAN story against the real
 * app: login flow, cookie-gated proxying, trust-fence header rewriting,
 * randomUUID polyfill injection, and WebSocket handshakes.
 *
 * Usage: pnpm run smoke   (requires the web app on 127.0.0.1:3080)
 */
import net from 'node:net'
import { startLanProxy } from '../lib/index.cjs'

const UPSTREAM = Number(process.env.DSH_SMOKE_UPSTREAM_PORT ?? 3080)
const USER = process.env.DSH_SMOKE_USER ?? 'admin'
const PASS = process.env.DSH_SMOKE_PASS ?? 'admin'

let passed = 0
let failed = 0

function check(name, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function cookieValue(setCookieHeader) {
  return setCookieHeader?.split(';')[0] ?? ''
}

function rawUpgrade(port, path, headers) {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      const lines = [
        `GET ${path} HTTP/1.1`,
        `Host: 127.0.0.1:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version: 13',
        ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
        '',
        '',
      ]
      socket.write(lines.join('\r\n'))
    })
    let data = ''
    const timer = setTimeout(() => {
      socket.destroy()
      resolve({ status: 0, text: data })
    }, 8000)
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8')
      if (data.includes('\r\n\r\n')) {
        clearTimeout(timer)
        socket.destroy()
        const status = Number(/^HTTP\/1\.[01] (\d+)/.exec(data)?.[1] ?? 0)
        resolve({ status, text: data })
      }
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve({ status: 0, text: data })
    })
  })
}

async function main() {
  const upstream = `http://127.0.0.1:${UPSTREAM}`
  console.log(`dsh-lan-proxy smoke — upstream ${upstream}, auth ${USER}/***`)
  const handle = startLanProxy({
    listenHost: '127.0.0.1',
    listenPort: 0,
    upstreamHost: '127.0.0.1',
    upstreamPort: UPSTREAM,
    username: USER,
    password: PASS,
    sessionTtlSeconds: 3600,
    log: (level, message) => console.log(`  [proxy:${level}] ${message}`),
  })
  const port = await handle.ready
  const base = `http://127.0.0.1:${port}`
  const origin = `http://127.0.0.1:${port}`

  try {
    // 1. anonymous navigation → login
    let res = await fetch(`${base}/`, { redirect: 'manual', headers: { accept: 'text/html' } })
    check('anonymous / redirects to /login', res.status === 302 && res.headers.get('location') === '/login', `status=${res.status} loc=${res.headers.get('location')}`)

    // 2. anonymous /api → 401 JSON
    res = await fetch(`${base}/api/state`, { redirect: 'manual' })
    check('anonymous /api → 401 JSON', res.status === 401, `status=${res.status}`)

    // 3. login page served
    res = await fetch(`${base}/login`)
    const loginHtml = await res.text()
    check('GET /login serves the form', res.status === 200 && loginHtml.includes('name="username"'), `status=${res.status}`)

    // 4. wrong password
    res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `username=${USER}&password=wrong`,
      redirect: 'manual',
    })
    check('wrong password → /login?error=1', res.status === 302 && res.headers.get('location') === '/login?error=1', `status=${res.status} loc=${res.headers.get('location')}`)

    // 5. login
    res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(USER)}&password=${encodeURIComponent(PASS)}`,
      redirect: 'manual',
    })
    const cookie = cookieValue(res.headers.get('set-cookie'))
    check('login sets a session cookie', res.status === 302 && cookie.startsWith('dsh_lan_session='), `status=${res.status} cookie=${cookie.slice(0, 24)}...`)

    // 6. proxied app with cookie: real DSH index + polyfill injected
    res = await fetch(`${base}/`, { headers: { cookie } })
    const html = await res.text()
    const polyfillAt = html.indexOf('randomUUID=function')
    const moduleAt = html.indexOf('<script type="module"')
    check('authenticated / serves the DSH app', res.status === 200 && html.includes('<div id="root">'), `status=${res.status}`)
    check('randomUUID polyfill injected before the app script', polyfillAt !== -1 && polyfillAt < moduleAt, `polyfillAt=${polyfillAt} moduleAt=${moduleAt}`)

    // 7. static asset through the proxy
    res = await fetch(`${base}/favicon.svg`, { headers: { cookie } })
    check('favicon served through the proxy', res.status === 200 && (res.headers.get('content-type') ?? '').includes('svg'), `status=${res.status}`)

    // 8. trust fence passes: GET /api/events.mux must reach the route (426 upgrade required), not 403
    res = await fetch(`${base}/api/events.mux`, { headers: { cookie } })
    check('/api/events.mux reaches the route (426, fence passed)', res.status === 426, `status=${res.status} (403 would mean the Host/Origin rewrite failed)`)

    // 9. websocket with cookie → 101
    const open = await rawUpgrade(port, '/api/events.mux', {
      Origin: origin,
      Cookie: cookie,
    })
    check('WS handshake with cookie → 101', open.status === 101, `status=${open.status}`)

    // 10. websocket without cookie → 401
    const denied = await rawUpgrade(port, '/api/events.mux', { Origin: origin })
    check('WS handshake without cookie → 401', denied.status === 401, `status=${denied.status}`)
  } finally {
    await handle.close()
  }

  console.log(`\nsmoke: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('smoke crashed:', err)
  process.exit(1)
})
