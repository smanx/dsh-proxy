/**
 * ProxyController: owns the lifecycle of the LAN proxy inside the harness —
 * effective options (cordis config overlaid with the persisted runtime
 * settings), start/stop/restart, and the status/update verbs the settings
 * page calls. No cordis dependency: the plugin entry in index.ts wires it
 * into the harness, which keeps every business rule unit-testable against a
 * real in-process upstream.
 */
import { lanAddresses, startLanProxy, type LanProxyHandle } from './proxy.ts'
import { RuntimeSettingsFile, normalizeRuntimeSettings, validateUpdate } from './settings.ts'
import type { LanProxyStatus, LanProxyUpdatePayload, LanProxyUpdateResult } from './contract.ts'

/** The fully-resolved runtime options of one proxy instance. */
export interface EffectiveProxyOptions {
  listenHost: string
  listenPort: number
  upstreamHost: string
  upstreamPort: number
  username: string
  password: string
  sessionTtlSeconds: number
}

export interface ProxyControllerOptions {
  /** Options from the cordis config (schema defaults applied, upstream port resolved). */
  base: EffectiveProxyOptions
  /** Path of the persisted runtime-settings JSON. */
  settingsFile: string
  /** Log sink (the plugin passes ctx.logger-based printer). */
  log: (level: 'info' | 'warn' | 'error', message: string) => void
}

export type UpdateOutcome =
  | { ok: true; result: LanProxyUpdateResult }
  | { ok: false; message: string }

/** Upstream reachability probe: connection timeout. */
const PROBE_TIMEOUT_MS = 1500
/** Upstream reachability probe: result cache lifetime. */
const PROBE_CACHE_MS = 3000

export class ProxyController {
  private handle: LanProxyHandle | null = null
  private boundPort: number | null = null
  private probeCache: { at: number; reachable: boolean } | null = null
  private readonly settings: RuntimeSettingsFile
  private readonly log: ProxyControllerOptions['log']
  private options: EffectiveProxyOptions

  constructor(private readonly opts: ProxyControllerOptions) {
    this.log = opts.log
    this.settings = new RuntimeSettingsFile(opts.settingsFile)
    this.options = { ...opts.base }
    const persisted = this.settings.read()
    if (persisted.upstreamPort !== undefined) this.options.upstreamPort = persisted.upstreamPort
    if (persisted.username !== undefined) this.options.username = persisted.username
    if (persisted.password !== undefined) this.options.password = persisted.password
  }

  /** Whether a persisted runtime override exists (drives the status flag). */
  private persisted(): boolean {
    const current = this.settings.read()
    return current.upstreamPort !== undefined || current.username !== undefined || current.password !== undefined
  }

  /**
   * Start the proxy (idempotent). Listen errors — the port is already taken,
   * e.g. by the standalone dsh-proxy — are logged loudly but never thrown, so
   * a failed forwarder can never take down the web app boot.
   */
  async start(): Promise<void> {
    if (this.handle !== null) return
    const log = this.log
    const handle = startLanProxy({
      listenHost: this.options.listenHost,
      listenPort: this.options.listenPort,
      upstreamHost: this.options.upstreamHost,
      upstreamPort: this.options.upstreamPort,
      username: this.options.username,
      password: this.options.password,
      sessionTtlSeconds: this.options.sessionTtlSeconds,
      log,
    })
    this.handle = handle
    try {
      const bound = await handle.ready
      this.boundPort = bound
      const urls = handle.describeUrls(bound)
      log('info', `dsh-lan-proxy: listening on ${this.options.listenHost}:${bound} -> http://${this.options.upstreamHost}:${this.options.upstreamPort}`)
      log('info', `dsh-lan-proxy: 本机访问 ${urls.local}`)
      for (const url of urls.lan) log('info', `dsh-lan-proxy: 局域网访问 ${url}`)
      if (this.options.username || this.options.password) {
        log('info', `dsh-lan-proxy: web auth enabled (username: ${this.options.username}); sessions last ${Math.round(this.options.sessionTtlSeconds / 3600)}h and are invalidated on restart`)
      } else {
        log('warn', 'dsh-lan-proxy: auth is DISABLED (username and password are both empty) — the LAN surface is open')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log('error', `dsh-lan-proxy: failed to listen on ${this.options.listenHost}:${this.options.listenPort}: ${message} — stop any other dsh-proxy on this port, or change listenPort`)
      this.handle = null
    }
  }

  /** Stop the proxy and every upgraded socket. */
  async stop(): Promise<void> {
    const handle = this.handle
    this.handle = null
    this.boundPort = null
    if (handle !== null) await handle.close()
  }

  /** Stop and start again with the current effective options (the "restart the forwarding service" verb). */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  /**
   * Current read-only status for the settings page. `upstreamReachable`
   * reflects the most recent probe (false until the first probe runs).
   */
  status(): LanProxyStatus {
    return {
      listenHost: this.options.listenHost,
      listenPort: this.boundPort ?? this.options.listenPort,
      proxyListening: this.boundPort !== null,
      upstreamHost: this.options.upstreamHost,
      upstreamPort: this.options.upstreamPort,
      upstreamReachable: this.probeCache?.reachable ?? false,
      username: this.options.username,
      authEnabled: this.options.username !== '' || this.options.password !== '',
      sessionTtlHours: Math.round(this.options.sessionTtlSeconds / 3600),
      persisted: this.persisted(),
    }
  }

  /**
   * Status with a fresh upstream reachability probe (cached for a few
   * seconds so repeated settings-page loads do not hammer the target).
   */
  async refreshStatus(): Promise<LanProxyStatus> {
    await this.probeUpstream()
    return this.status()
  }

  /**
   * Probe whether the target upstream service answers HTTP. Any response —
   * even an error status — counts as reachable; only connection failures and
   * timeouts turn the light red.
   */
  private async probeUpstream(): Promise<boolean> {
    const now = Date.now()
    if (this.probeCache !== null && now - this.probeCache.at < PROBE_CACHE_MS) {
      return this.probeCache.reachable
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    let reachable = false
    try {
      const res = await fetch(
        `http://${this.options.upstreamHost}:${this.options.upstreamPort}/favicon.svg`,
        { signal: controller.signal, redirect: 'manual' },
      )
      reachable = true
      await res.body?.cancel().catch(() => {})
    } catch {
      reachable = false
    } finally {
      clearTimeout(timer)
    }
    this.probeCache = { at: now, reachable }
    return reachable
  }

  /**
   * Apply an update payload: validate, persist, then restart the forwarding
   * service with the new effective options.
   * @param payload - raw RPC payload from the settings page.
   * @returns the new status, or a user-facing rejection message.
   */
  async update(payload: unknown): Promise<UpdateOutcome> {
    // Validate against the actually bound port: with listenPort 0 the OS
    // assigns the port, and the configured 0 must never be the comparison.
    const check = validateUpdate(payload, this.boundPort ?? this.options.listenPort)
    if (!check.ok) return { ok: false, message: check.message }
    const patch = check.patch as LanProxyUpdatePayload

    const next: LanProxyUpdatePayload = { ...this.settings.read(), ...patch }
    this.settings.write(next)

    if (patch.upstreamPort !== undefined) this.options.upstreamPort = patch.upstreamPort
    if (patch.username !== undefined) this.options.username = patch.username
    if (patch.password !== undefined) this.options.password = patch.password

    await this.restart()
    this.probeCache = null
    this.log('info', 'dsh-lan-proxy: settings updated via the settings page; forwarding service restarted')
    return {
      ok: true,
      result: {
        status: await this.refreshStatus(),
        message: '已保存并重启转发服务',
      },
    }
  }
}
