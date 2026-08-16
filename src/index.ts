/**
 * dsh-lan-proxy host plugin: mounts the authenticated LAN reverse proxy on a
 * second port, forwarding the web app's loopback listener (127.0.0.1:3080 by
 * default) to the LAN with a web-based login gate. The harness deliberately
 * refuses `--host 0.0.0.0` for the web server itself — remote code execution
 * exposure — so this plugin is the sanctioned way to serve the surface beyond
 * loopback, with authentication in front.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: merges `ctx.webServer` into the Context type.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { lanAddresses, startLanProxy } from './proxy.ts'

// Standalone API for scripts and smoke tests, exercised through the same
// bundled artifact the profile loads.
export { lanAddresses, startLanProxy } from './proxy.ts'
export type { LanProxyHandle, LanProxyOptions } from './proxy.ts'

/** Stable Cordis plugin name (the Loader entry and package name). */
export const name = 'dsh-lan-proxy'

/** Services required before load: the web server, whose bound port is the default upstream. */
export const inject = ['webServer']

/** Plugin configuration, validated at load by the Loader. */
export interface Config {
  /** Interface the proxy binds; 0.0.0.0 exposes the LAN. */
  listenHost: string
  /** Port the proxy listens on (must differ from the web app's port). */
  listenPort: number
  /** Upstream DSH bind host. */
  upstreamHost: string
  /** Upstream DSH port; 0 follows the web app's actual bound port. */
  upstreamPort: number
  /** Login / Basic Auth username; empty together with `password` disables auth. */
  username: string
  /** Login / Basic Auth password; empty together with `username` disables auth. */
  password: string
  /** Session cookie lifetime in hours. */
  sessionTtlHours: number
}

/** Configuration schema; deployment-varying bounds stay tunable from cordis.yml. */
export const Config = z.object({
  listenHost: z.string().default('0.0.0.0'),
  listenPort: z.natural().max(65535).default(3081),
  upstreamHost: z.string().default('127.0.0.1'),
  upstreamPort: z.natural().max(65535).default(0),
  username: z.string().default('admin'),
  password: z.string().default('admin'),
  sessionTtlHours: z.natural().max(720).default(12),
})

/**
 * Start the proxy as an effect on this plugin's fiber: unloading the plugin
 * closes the listener and every upgraded socket.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved = Config(config ?? {})
  const upstreamPort = resolved.upstreamPort || ctx.webServer.port || 3080
  const log = (level: 'info' | 'warn' | 'error', message: string): void => {
    ctx.logger[level](message)
  }
  const handle = startLanProxy({
    listenHost: resolved.listenHost,
    listenPort: resolved.listenPort,
    upstreamHost: resolved.upstreamHost,
    upstreamPort,
    username: resolved.username,
    password: resolved.password,
    sessionTtlSeconds: resolved.sessionTtlHours * 3600,
    log,
  })
  void handle.ready
    .then((bound) => {
      const urls = handle.describeUrls(bound)
      log('info', `dsh-lan-proxy: listening on ${resolved.listenHost}:${bound} -> http://${resolved.upstreamHost}:${upstreamPort}`)
      log('info', `dsh-lan-proxy: 本机访问 ${urls.local}`)
      for (const url of urls.lan) log('info', `dsh-lan-proxy: 局域网访问 ${url}`)
      if (resolved.username || resolved.password) {
        log('info', `dsh-lan-proxy: web auth enabled (username: ${resolved.username}); sessions last ${resolved.sessionTtlHours}h and are invalidated on restart`)
      } else {
        log('warn', 'dsh-lan-proxy: auth is DISABLED (username and password are both empty) — the LAN surface is open')
      }
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      log('error', `dsh-lan-proxy: failed to start: ${message} — stop any other dsh-proxy on this port, or change listenPort`)
    })
  ctx.effect(() => () => void handle.close(), 'dsh-lan-proxy.listen')
}
