/**
 * The LAN reverse proxy core: an HTTP + WebSocket reverse proxy that forwards
 * to the local DSH service (127.0.0.1:<upstreamPort>) and gates every request
 * behind the web-based auth (login page + signed session cookie, with Basic
 * Auth as fallback). Pure node — no cordis; the plugin entry in index.ts wires
 * it into the harness lifecycle.
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
 */
import http from 'node:http'
import type { Duplex } from 'node:stream'
import net from 'node:net'
import os from 'node:os'
import httpProxy from 'http-proxy'
import { Authenticator, SESSION_COOKIE, safeEqual } from './session.ts'
import { loginPage, parseUrlencoded } from './login.ts'
import { injectPolyfill, RANDOM_UUID_POLYFILL } from './polyfill.ts'

export interface LanProxyOptions {
  /** Interface the proxy binds (0.0.0.0 for LAN access). */
  listenHost: string
  /** Port the proxy listens on; 0 asks the OS for a free port. */
  listenPort: number
  /** Upstream DSH bind host, normally the loopback address. */
  upstreamHost: string
  /** Upstream DSH port (the web app's actual bound port). */
  upstreamPort: number
  /** Login / Basic Auth username; empty together with `password` disables auth. */
  username: string
  /** Login / Basic Auth password; empty together with `username` disables auth. */
  password: string
  /** Session cookie lifetime in seconds. */
  sessionTtlSeconds: number
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

const MAX_LOGIN_BODY_BYTES = 16 * 1024
const UNAUTHORIZED_JSON = '{"error":"unauthorized"}'
/** Basic Auth realm presented to unauthenticated external clients. */
const AUTH_REALM = 'dsh-lan-proxy'

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
    username,
    password,
    sessionTtlSeconds,
    log = () => {},
  } = options
  const targetOrigin = `http://${upstreamHost}:${upstreamPort}`
  const auth = new Authenticator({ username, password, sessionTtlSeconds })

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

  // Inject the randomUUID polyfill into proxied HTML documents. The
  // response streams chunk by chunk, so the first write is rewritten and
  // content-length is dropped (the chunked stream then carries the body).
  proxy.on('proxyRes', (proxyRes, _req, res) => {
    const contentType = String(proxyRes.headers['content-type'] ?? '')
    if (!contentType.includes('text/html') || proxyRes.headers['content-encoding']) return
    delete proxyRes.headers['content-length']
    res.removeHeader('content-length')
    let injected = false
    // The interceptor must be attached before any data flows; http-proxy
    // emits proxyRes before piping, so hooking res.write here is safe.
    const origWrite = res.write.bind(res)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any).write = (chunk: any, ...rest: any[]) => {
      if (!injected) {
        injected = true
        const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
        chunk = Buffer.from(injectPolyfill(text, RANDOM_UUID_POLYFILL))
      }
      return origWrite(chunk, ...rest)
    }
  })

  const alignOrigin = (req: http.IncomingMessage): void => {
    if (req.headers.origin) req.headers.origin = targetOrigin
  }

  const redirect = (res: http.ServerResponse, location: string): void => {
    res.writeHead(302, { location })
    res.end()
  }

  const deny = (res: http.ServerResponse): void => {
    res.writeHead(401, {
      'content-type': 'application/json',
      'www-authenticate': `Basic realm="${AUTH_REALM}"`,
    })
    res.end(UNAUTHORIZED_JSON)
  }

  /**
   * Challenge an unauthenticated browser navigation with HTTP Basic Auth:
   * the 401 plus WWW-Authenticate makes the browser show its native Basic
   * login dialog (the external Basic gate), and the login page served as the
   * response body is what the user sees when the dialog is dismissed — the
   * web-based fallback.
   */
  const challenge = (res: http.ServerResponse): void => {
    res.writeHead(401, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'www-authenticate': `Basic realm="${AUTH_REALM}"`,
    })
    res.end(loginPage(false, Math.max(1, Math.round(sessionTtlSeconds / 3600))))
  }

  const handleLogin = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    if (req.method === 'POST') {
      let body = ''
      let tooBig = false
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8')
        if (body.length > MAX_LOGIN_BODY_BYTES) tooBig = true
      })
      req.on('end', () => {
        if (tooBig) {
          redirect(res, '/login?error=1')
          return
        }
        if (!auth.enabled) {
          // Password login is off: the gate is open, nothing to validate.
          redirect(res, '/')
          return
        }
        const form = parseUrlencoded(body)
        const credentialsOk = safeEqual(form.username ?? '', username) && safeEqual(form.password ?? '', password)
        if (!credentialsOk) {
          redirect(res, '/login?error=1')
          return
        }
        const token = auth.sessions.issue(form.username)
        res.writeHead(302, {
          location: '/',
          'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlSeconds}`,
        })
        res.end()
      })
      return
    }
    if (auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
      redirect(res, '/')
      return
    }
    const error = new URL(req.url ?? '/', 'http://proxy.local').searchParams.has('error')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(loginPage(error, Math.max(1, Math.round(sessionTtlSeconds / 3600))))
  }

  const handleLogout = (_req: http.IncomingMessage, res: http.ServerResponse): void => {
    res.writeHead(302, {
      location: '/login',
      'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    })
    res.end()
  }

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://proxy.local').pathname
    if (pathname === '/login') {
      handleLogin(req, res)
      return
    }
    if (pathname === '/logout') {
      handleLogout(req, res)
      return
    }
    if (!auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
      if (pathname.startsWith('/api/')) {
        deny(res)
        return
      }
      const accept = String(req.headers.accept ?? '')
      if (accept.includes('text/html')) {
        challenge(res)
        return
      }
      deny(res)
      return
    }
    alignOrigin(req)
    proxy.web(req, res)
  })

  const upgradedSockets = new Set<net.Socket>()
  server.on('upgrade', (req, socket, head) => {
    if (!auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
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
      // short grace before connections are force-closed.
      server.close(() => resolveClose())
      const timer = setTimeout(() => {
        server.closeAllConnections()
      }, 500)
      timer.unref?.()
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
