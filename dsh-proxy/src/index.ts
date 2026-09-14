/**
 * dsh-proxy host plugin: mounts the authenticated LAN reverse proxy on a
 * second port, forwarding the web app's loopback listener (127.0.0.1:3080 by
 * default) to the LAN with a web-based login gate. The harness deliberately
 * refuses `--host 0.0.0.0` for the web server itself — remote code execution
 * exposure — so this plugin is the sanctioned way to serve the surface beyond
 * loopback, with authentication in front.
 *
 * The plugin also mounts the `/dsh-proxy` generic Connection RPC channel:
 * `status` reads the running proxy, `update` persists a settings patch (target
 * upstream port, username, password) into `$DSH_HOME/dsh-proxy.json` and
 * restarts the forwarding service — the backend of the settings section.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage } from 'node:http'
import z from '@deepseek-ai/schemastery'
// Type-only: merges `ctx.webServer` into the Context type.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges `ctx.connection` (host Connection RPC registry).
import type {} from '@deepseek-ai/dsh-client-connection'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { ProxyController } from './controller.ts'
import { RPC_CHANNEL, RPC_START_ENDPOINT, RPC_STATUS_ENDPOINT, RPC_STOP_ENDPOINT, RPC_UPDATE_ENDPOINT } from './contract.ts'

// Standalone API for scripts and smoke tests, exercised through the same
// bundled artifact the profile loads.
export { lanAddresses, startLanProxy } from './proxy.ts'
export type { LanProxyHandle, LanProxyOptions } from './proxy.ts'

/** Stable Cordis plugin name (the Loader entry and package name). */
export const name = '@smanx/dsh-proxy'

/** Services required before load: the web server (upstream port source) and the Connection RPC registry. */
export const inject = ['webServer', 'connection']

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
  /** Login / Basic Auth username; password login is enabled only when both it and `password` are set. */
  username: string
  /** Login / Basic Auth password; password login is enabled only when both it and `username` are set. */
  password: string
}

/** Configuration schema; deployment-varying bounds stay tunable from cordis.yml. */
export const Config = z.object({
  listenHost: z.string().default('0.0.0.0'),
  listenPort: z.natural().max(65535).default(3081),
  upstreamHost: z.string().default('127.0.0.1'),
  upstreamPort: z.natural().max(65535).default(0),
  username: z.string().default(''),
  password: z.string().default(''),
})

/** Maximum request body accepted by the plugin-owned settings RPC route. */
const MAX_RPC_BODY_BYTES = 1024 * 1024

/** Return whether a decoded JSON value exposes named fields. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Host Connection methods provided by current DSH but absent from the oldest published type package. */
interface CurrentHostConnection {
  authenticatedUrl(baseUrl: string): string
  requestRejection(request: IncomingMessage): 401 | 403 | undefined
}

/**
 * Mount the proxy and the RPC channel as effects on this plugin's fiber:
 * unloading the plugin closes the listener, every upgraded socket, and the
 * channel.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export async function apply(ctx: Context, config?: Config): Promise<void> {
  const resolved = Config(config ?? {})
  const log = (level: 'info' | 'warn' | 'error', message: string): void => {
    ctx.logger[level](message)
  }
  const connection = ctx.connection as typeof ctx.connection & CurrentHostConnection
  const upstreamPort = resolved.upstreamPort || ctx.webServer.port || 3080
  // 启动令牌只交给本机代理，用于把通过 Basic Auth 的首次页面请求兑换为 DSH 会话。
  const upstreamToken = new URL(
    connection.authenticatedUrl(`http://${resolved.upstreamHost}:${String(upstreamPort)}`),
  ).searchParams.get('token') ?? ''
  const controller = new ProxyController({
    base: {
      listenHost: resolved.listenHost,
      listenPort: resolved.listenPort,
      upstreamHost: resolved.upstreamHost,
      upstreamPort,
      upstreamToken,
      username: resolved.username,
      password: resolved.password,
    },
    settingsFile: dshHomePath('dsh-proxy.json'),
    log,
  })

  ctx.effect(
    async () => {
      await controller.start()
      return () => controller.stop()
    },
    'dsh-proxy.proxy',
  )

  const handleRpc = async (endpoint: string, payload: unknown) => {
          if (endpoint === RPC_STATUS_ENDPOINT) {
            return { ok: true, value: await controller.refreshStatus() }
          }
          if (endpoint === RPC_START_ENDPOINT) {
            const outcome = await controller.start()
            if (!outcome.ok) {
              // The listener did not bind (e.g. the port is taken): answer with
              // the real reason so the settings page reports it instead of
              // claiming the proxy started.
              return {
                ok: false,
                error: { code: 'bad-request', message: outcome.message, details: { issues: [] } },
              }
            }
            return { ok: true, value: await controller.refreshStatus() }
          }
          if (endpoint === RPC_STOP_ENDPOINT) {
            // Answered before the listener closes so the response survives
            // when the caller is connected through the proxy.
            return { ok: true, value: controller.stopDeferred() }
          }
          if (endpoint === RPC_UPDATE_ENDPOINT) {
            const outcome = await controller.update(payload)
            if (outcome.ok) return { ok: true, value: outcome.result }
            return {
              ok: false,
              error: { code: 'bad-request', message: outcome.message, details: { issues: [] } },
            }
          }
          return {
            ok: false,
            error: {
              code: 'bad-request',
              message: `unknown endpoint ${JSON.stringify(endpoint)}`,
              details: { issues: [] },
            },
          }
  }

  // 当前 Connection 自定义通道在部分 DSH 版本中无法继承 webServer 注入，直接注册等价路由。
  await ctx.inject(['webServer', 'connection'], (webCtx) => {
    // 请求处理阶段不再读取 Cordis 上下文，避免异步回调失去服务注入。
    const webConnection = webCtx.connection as typeof webCtx.connection & CurrentHostConnection
    const rejectRequest = webConnection.requestRejection.bind(webConnection)
    return webCtx.webServer.register({
      kind: 'prefix',
      path: RPC_CHANNEL,
      handler: async (req, res) => {
        const endpoint = new URL(req.url ?? '/', 'http://dsh.local').pathname.slice(RPC_CHANNEL.length + 1)
        if (req.method !== 'POST' || endpoint === '' || endpoint.includes('/')) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        const rejection = rejectRequest(req)
        if (rejection !== undefined) {
          res.writeHead(rejection)
          res.end(rejection === 401 ? 'unauthorized' : 'forbidden')
          return
        }
        if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          res.writeHead(415)
          res.end('content type must be application/json')
          return
        }

        const chunks: Buffer[] = []
        let bodyBytes = 0
        for await (const chunk of req) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          bodyBytes += bytes.length
          if (bodyBytes <= MAX_RPC_BODY_BYTES) chunks.push(bytes)
        }
        if (bodyBytes > MAX_RPC_BODY_BYTES) {
          res.writeHead(413)
          res.end('request body too large')
          return
        }

        let message: unknown
        try {
          message = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          res.writeHead(400)
          res.end('body is not JSON')
          return
        }
        if (!isRecord(message) || message.type !== 'client-request' || typeof message.rpcId !== 'string'
          || message.method !== endpoint) {
          res.writeHead(400)
          res.end('invalid client-request message')
          return
        }

        try {
          const result = await handleRpc(endpoint, message.payload)
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ type: 'server-response', rpcId: message.rpcId, result }))
        } catch (error) {
          res.writeHead(500)
          res.end(`handler failure: ${String(error)}`)
        }
      },
    })
  })
}
