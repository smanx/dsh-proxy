/**
 * The LAN reverse proxy core: an HTTP + WebSocket reverse proxy that forwards
 * to the local DSH service (127.0.0.1:<upstreamPort>) and gates every request
 * behind HTTP Basic Auth — the browser's NATIVE credential dialog, exactly
 * like the standalone dsh-proxy. No custom login page or proxy-owned session
 * exists: after a successful Basic login the browser caches the credentials
 * for the origin and sends them on every request (including WebSocket
 * handshakes). The first authenticated root request exchanges DSH's launch
 * token for DSH's own browser-session cookie.
 * Pure node — no cordis; the plugin entry in index.ts wires it into the
 * harness lifecycle.
 *
 * Three compatibility fixes make the proxied LAN surface work exactly like
 * loopback access:
 * - `changeOrigin` rewrites Host to the upstream loopback authority, so the
 *   DSH `/api` browser-trust fence sees a loopback Host.
 * - The browser's Origin is aligned to the same upstream authority (the fence
 *   requires Origin to equal the Host it sees), which also covers WebSocket
 *   upgrades.
 * - The `crypto.randomUUID` polyfill is injected into every proxied HTML
 *   document, because LAN pages are a non-secure context where randomUUID is
 *   undefined.
 *
 * A fourth fix (dsh 0.1.1+) patches served JavaScript instead of HTML: the
 * client now computes `connection.isLoopback` from `location.hostname` and
 * keeps settings remote-only on non-loopback pages ("settings are unavailable
 * in this browser"). Since the hostname cannot be spoofed, the proxy rewrites
 * the bundle bytes to restore host-trust — unconditionally, like every other
 * compatibility fix here: the Host/Origin rewrite already presents proxied
 * traffic as loopback to the server-side fence, so withholding only the
 * client-side alignment would leave the UI degraded while the wire stayed
 * fully open. Basic Auth remains the one security barrier for the surface.
 */
import http from 'node:http'
import type { Duplex } from 'node:stream'
import net from 'node:net'
import os from 'node:os'
import httpProxy from 'http-proxy'
import { Authenticator } from './session.ts'
import { injectPolyfill, RANDOM_UUID_POLYFILL } from './polyfill.ts'
import { isJavaScriptContentType, patchClientScript } from './clientpatch.ts'
import { attachBodyTransform } from './compression.ts'

export interface LanProxyOptions {
  /** Interface the proxy binds (0.0.0.0 for LAN access). */
  listenHost: string
  /** Port the proxy listens on; 0 asks the OS for a free port. */
  listenPort: number
  /** Upstream DSH bind host, normally the loopback address. */
  upstreamHost: string
  /** Upstream DSH port (the web app's actual bound port). */
  upstreamPort: number
  /** DSH process token used only for the first upstream browser-session exchange. */
  upstreamToken?: string
  /** Basic Auth username; password login is enabled only when both it and `password` are set. */
  username: string
  /** Basic Auth password; password login is enabled only when both it and `username` are set. */
  password: string
  /** Optional sink for human-readable lifecycle messages. */
  log?: (level: 'info' | 'warn' | 'error', message: string) => void
}

export interface LanProxyHandle {
  /** Resolves with the bound port once listening; rejects on bind errors. */
  ready: Promise<number>
  /** Close the listener and every upgraded socket. */
  close: () => Promise<void>
  /** Human-readable access URLs (local + LAN) for the configured port. */
  describeUrls: (boundPort: number) => { local: string; lan: string[] }
}

/** Basic Auth realm presented to unauthenticated clients. */
const AUTH_REALM = 'dsh-proxy'

/**
 * Static files browsers fetch OUTSIDE the authenticated document context
 * (the PWA manifest and the favicon are requested without credentials), so
 * gating them on Basic auth 401s them. They carry no secrets and the
 * upstream serves them unauthenticated anyway.
 */
const PUBLIC_PATHS = new Set(['/manifest.webmanifest', '/favicon.svg'])

/** LAN IPv4 addresses the host currently has, as http URLs on `port`. */
export function lanAddresses(port: number): string[] {
  const ips: string[] = []
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const entry of ifaces ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) ips.push(entry.address)
    }
  }
  return ips.map((ip) => `http://${ip}:${port}`)
}

export function startLanProxy(options: LanProxyOptions): LanProxyHandle {
  const {
    listenHost,
    listenPort,
    upstreamHost,
    upstreamPort,
    upstreamToken = '',
    username,
    password,
    log = () => {},
  } = options
  const targetOrigin = `http://${upstreamHost}:${upstreamPort}`
  const auth = new Authenticator({ username, password })

  const proxy = httpProxy.createProxyServer({
    target: targetOrigin,
    ws: true,
    changeOrigin: true,
  })
  proxy.on('error', (err, _req, res) => {
    log('error', `upstream ${targetOrigin} error: ${err.message}`)
    if (res && 'writeHead' in res && !res.headersSent) {
      try {
        res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('502 Bad Gateway')
      } catch {
        /* socket already gone */
      }
    }
  })

  // Inject the randomUUID polyfill into proxied HTML documents, and rewrite
  // served JavaScript so the client treats the authenticated proxy as
  // host-trusted (see clientpatch.ts). The upstream DSH server compresses its
  // responses (gzip by default), so these plain-text rewrites run through a
  // compression-aware pipeline that buffers the response, decompresses by its
  // Content-Encoding, applies the rewrite on the plain text, then recompresses
  // by the original encoding (see compression.ts). content-length is dropped
  // because the rewrite changes the body length; the chunked stream then
  // carries the body.
  proxy.on('proxyRes', (proxyRes, _req, res) => {
    const contentType = String(proxyRes.headers['content-type'] ?? '')
    const isHtml = contentType.includes('text/html')
    const isJs = isJavaScriptContentType(contentType)
    if (!isHtml && !isJs) return

    attachBodyTransform(res, proxyRes, (plain) => {
      const text = plain.toString('utf8')
      // HTML: inject the randomUUID polyfill.
      if (isHtml) {
        return Buffer.from(injectPolyfill(text, RANDOM_UUID_POLYFILL))
      }
      // JS: rewrite the loopback-trust needles (applied unconditionally — the
      // Host/Origin rewrite already lets the server-side fence treat proxied
      // traffic as loopback, so withholding only the client-side alignment
      // would leave the UI degraded). Nothing matched means no rewrite needed:
      // return null to passthrough without recompressing.
      const { code, matched } = patchClientScript(text)
      if (matched.length > 0) {
        log('info', `loopback-trust patch applied: ${matched.join(', ')}`)
        return Buffer.from(code)
      }
      return null
    })
  })

  const alignOrigin = (req: http.IncomingMessage): void => {
    if (req.headers.origin) req.headers.origin = targetOrigin
  }

  /**
   * Challenge with HTTP Basic Auth: the 401 plus WWW-Authenticate makes the
   * browser show its NATIVE credential dialog. No custom login page exists —
   * this is the whole authentication surface, matching the standalone
   * dsh-proxy. (Browsers cache the credentials per origin after a successful
   * login and silently replay them, including on WebSocket handshakes.)
   */
  const challenge = (res: http.ServerResponse): void => {
    res.writeHead(401, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'www-authenticate': `Basic realm="${AUTH_REALM}"`,
    })
    res.end('401 Unauthorized')
  }

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://proxy.local').pathname
    // Public static files (PWA manifest, favicon): fetched without
    // credentials by the browser, so they bypass the auth gate.
    if (PUBLIC_PATHS.has(pathname)) {
      alignOrigin(req)
      proxy.web(req, res)
      return
    }
    if (!auth.isAuthenticated(req.headers.authorization)) {
      challenge(res)
      return
    }
    // Basic Auth 通过后，仅在首次根页面请求中向上游注入启动令牌以兑换 DSH 会话 cookie。
    if (req.method === 'GET' && pathname === '/' && upstreamToken !== ''
      && !(req.headers.cookie ?? '').includes('dsh-auth-')) {
      const upstreamUrl = new URL(req.url ?? '/', 'http://proxy.local')
      upstreamUrl.searchParams.set('token', upstreamToken)
      req.url = `${upstreamUrl.pathname}${upstreamUrl.search}`
    }
    alignOrigin(req)
    proxy.web(req, res)
  })

  const upgradedSockets = new Set<net.Socket>()
  server.on('upgrade', (req, socket, head) => {
    if (!auth.isAuthenticated(req.headers.authorization)) {
      socket.end(`HTTP/1.1 401 Unauthorized\r\nwww-authenticate: Basic realm="${AUTH_REALM}"\r\nConnection: close\r\n\r\n`)
      return
    }
    upgradedSockets.add(socket as net.Socket)
    ;(socket as net.Socket).once('close', () => upgradedSockets.delete(socket as net.Socket))
    alignOrigin(req)
    proxy.ws(req, socket as Duplex, head)
  })

  const ready = new Promise<number>((resolve, reject) => {
    const onListenError = (err: NodeJS.ErrnoException): void => {
      log('error', `cannot listen on ${listenHost}:${listenPort}: ${err.code ?? err.message}`)
      reject(err)
    }
    server.once('error', onListenError)
    server.listen(listenPort, listenHost, () => {
      server.off('error', onListenError)
      server.on('error', (err) => log('error', `proxy server error: ${err.message}`))
      resolve((server.address() as net.AddressInfo).port)
    })
  })

  const close = async (): Promise<void> => {
    for (const socket of upgradedSockets) socket.destroy()
    upgradedSockets.clear()
    await new Promise<void>((resolveClose) => {
      // Stop accepting new connections; the listener is released immediately
      // so a restart can rebind the same port. In-flight responses (e.g. the
      // settings-page update answer travelling back through the proxy) get a
      // short grace before connections are force-closed. The timer stays
      // referenced so it always fires even under a loaded event loop.
      server.close(() => resolveClose())
      const timer = setTimeout(() => {
        server.closeAllConnections()
      }, 250)
    })
  }

  return {
    ready,
    close,
    describeUrls: (boundPort) => ({
      local: `http://127.0.0.1:${boundPort}`,
      lan: lanAddresses(boundPort),
    }),
  }
}
