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
import z from '@deepseek-ai/schemastery'
// Type-only: merges `ctx.webServer` into the Context type.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges `ctx.connection` (host Connection RPC registry) and names
// the decoded-endpoint handler the channel registration accepts.
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
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

/**
 * The Connection host service's channel registrar.
 *
 * DSH 0.1.7 moved Connection's `webServer` dependency behind a nested
 * `ctx.inject(['webServer'], ...)`, so the service's own context no longer
 * resolves `webServer`. `ctx.connection.rpc.handle` derives the route owner
 * from exactly that context, then mounts the channel's physical route through
 * `owner.webServer` — which throws `cannot get property "webServer" without
 * inject` and aborts the whole plugin load.
 *
 * `HostConnectionService.register` takes the owning context explicitly, so
 * passing this plugin's own context (which injects `webServer`) mounts the
 * route on a context that can resolve it. The method is not part of the public
 * `HostConnectionHandle` face, hence the local shape.
 */
interface ConnectionChannelRegistrar {
  register(owner: Context, channel: string, handler: ConnectionRpcHandler): () => void
}

/**
 * Mount the proxy and the RPC channel as effects on this plugin's fiber:
 * unloading the plugin closes the listener, every upgraded socket, and the
 * channel.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved = Config(config ?? {})
  const log = (level: 'info' | 'warn' | 'error', message: string): void => {
    ctx.logger[level](message)
  }
  const controller = new ProxyController({
    base: {
      listenHost: resolved.listenHost,
      listenPort: resolved.listenPort,
      upstreamHost: resolved.upstreamHost,
      upstreamPort: resolved.upstreamPort || ctx.webServer.port || 3080,
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

  const connection = ctx.connection as unknown as ConnectionChannelRegistrar

  ctx.effect(
    () => {
      const dispose = connection.register(ctx, RPC_CHANNEL, async (endpoint, payload) => {
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
      })
      return () => void dispose()
    },
    'dsh-proxy.rpc',
  )
}
