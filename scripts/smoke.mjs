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
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
    // 1. anonymous navigation → redirected to the login page
    let res = await fetch(`${base}/`, { redirect: 'manual', headers: { accept: 'text/html' } })
    check(
      'anonymous / redirects to /login',
      res.status === 302 && res.headers.get('location') === '/login',
      `status=${res.status} loc=${res.headers.get('location')}`,
    )

    // 2. anonymous /api → 401 JSON with a Basic challenge (scripts)
    res = await fetch(`${base}/api/state`, { redirect: 'manual' })
    check('anonymous /api → 401 JSON', res.status === 401 && /^Basic realm=/.test(res.headers.get('www-authenticate') ?? ''), `status=${res.status}`)

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

  await pluginContractPhase()

  console.log(`\nsmoke: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

/**
 * Plugin-contract phase: drive the BUNDLED apply() (lib/index.cjs — the same
 * artifact the profile loads) against a fake cordis ctx, exercising the
 * /dsh-lan-proxy RPC channel, the settings persistence, and the restart path
 * end to end without the web app. $DSH_HOME is redirected to a temp dir so
 * the smoke never touches the user's real persisted config.
 */
async function pluginContractPhase() {
  console.log('\ndsh-lan-proxy plugin contract — bundled apply() with a fake ctx')
  const plugin = await import('../lib/index.cjs')
  check(
    'plugin exports name/inject/Config/apply',
    ['name', 'inject', 'Config', 'apply'].every((key) => key in plugin)
      && plugin.name === 'dsh-lan-proxy'
      && plugin.inject.includes('webServer')
      && plugin.inject.includes('connection'),
  )

  const tempHome = mkdtempSync(join(tmpdir(), 'dsh-lan-proxy-smoke-'))
  process.env.DSH_HOME = tempHome
  try {
    let registered = null
    const effectFns = []
    const fakeCtx = {
      webServer: { port: UPSTREAM, host: '127.0.0.1' },
      connection: {
        rpc: {
          handle: (channel, handler, options) => {
            registered = { channel, handler, options }
            return async () => {}
          },
        },
      },
      logger: {
        info: (message) => console.log(`  [plugin:info] ${message}`),
        warn: (message) => console.log(`  [plugin:warn] ${message}`),
        error: (message) => console.log(`  [plugin:error] ${message}`),
      },
      effect: (fn) => {
        effectFns.push(fn)
        return () => {}
      },
    }
    plugin.apply(fakeCtx, { listenHost: '127.0.0.1', listenPort: 0 })
    const proxyDisposer = await effectFns[0]()
    const rpcCleanup = effectFns[1]()
    check(
      'RPC channel registered as /dsh-lan-proxy with loopback authority',
      registered?.channel === '/dsh-lan-proxy' && registered?.options?.authority === 'loopback',
    )

    const status1 = await registered.handler('status', undefined, new AbortController().signal)
    check(
      'RPC status returns ok with a bound port and green lights',
      status1?.ok === true
        && typeof status1.value?.listenPort === 'number'
        && status1.value?.listenPort > 0
        && status1.value?.proxyListening === true
        && status1.value?.upstreamReachable === true,
      JSON.stringify(status1),
    )

    const updated = await registered.handler(
      'update',
      { username: 'smoke-user', password: 'smoke-pass' },
      new AbortController().signal,
    )
    check(
      'RPC update rotates credentials and restarts',
      updated?.ok === true && updated.value?.status?.username === 'smoke-user',
      JSON.stringify(updated),
    )

    const status2 = await registered.handler('status', undefined, new AbortController().signal)
    check(
      'status reflects the new username and persisted flag',
      status2?.ok === true && status2.value?.username === 'smoke-user' && status2.value?.persisted === true,
    )

    const persisted = JSON.parse(readFileSync(join(tempHome, 'dsh-lan-proxy.json'), 'utf8'))
    check(
      'patch persisted to $DSH_HOME/dsh-lan-proxy.json',
      persisted.username === 'smoke-user' && persisted.password === 'smoke-pass',
    )

    const conflict = await registered.handler(
      'update',
      { upstreamPort: status2.value.listenPort },
      new AbortController().signal,
    )
    check('conflicting upstream port rejected by the channel', conflict?.ok === false, JSON.stringify(conflict))

    const stopped = await registered.handler('stop', {}, new AbortController().signal)
    check(
      'RPC stop answers with the proxy stopped',
      stopped?.ok === true && stopped.value?.proxyListening === false,
      JSON.stringify(stopped),
    )
    // Let the deferred listener close, then bring it back up.
    await new Promise((resolve) => setTimeout(resolve, 400))
    const started = await registered.handler('start', {}, new AbortController().signal)
    check(
      'RPC start brings the proxy back up',
      started?.ok === true && started.value?.proxyListening === true,
      JSON.stringify(started),
    )

    rpcCleanup()
    await proxyDisposer()
  } finally {
    delete process.env.DSH_HOME
    rmSync(tempHome, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error('smoke crashed:', err)
  process.exit(1)
})
