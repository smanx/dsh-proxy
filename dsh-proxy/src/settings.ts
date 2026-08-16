/**
 * Persisted runtime settings for the LAN proxy: a small JSON file under the
 * DSH home that overlays the cordis config. The settings page writes here so
 * changes survive `dsh web` restarts; the file is the single source of truth
 * for the runtime overrides (proxy listen port, username, password).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { LanProxyUpdatePayload } from './contract.ts'

/** The on-disk shape (a subset of the update payload; no derived fields). */
export interface PersistedRuntimeSettings {
  /** Proxy listen port override. */
  listenPort?: number
  /** Deprecated forward-target override, kept for legacy persisted files. */
  upstreamPort?: number
  username?: string
  password?: string
}

/** Tolerant read of an unknown JSON value into the persisted shape. */
export function normalizeRuntimeSettings(raw: unknown): PersistedRuntimeSettings {
  if (typeof raw !== 'object' || raw === null) return {}
  const source = raw as Record<string, unknown>
  const out: PersistedRuntimeSettings = {}
  if (typeof source.listenPort === 'number' && Number.isInteger(source.listenPort)) {
    out.listenPort = source.listenPort
  }
  if (typeof source.upstreamPort === 'number' && Number.isInteger(source.upstreamPort)) {
    out.upstreamPort = source.upstreamPort
  }
  if (typeof source.username === 'string') out.username = source.username
  if (typeof source.password === 'string') out.password = source.password
  return out
}

/**
 * Read/write access to the persisted settings file. Writes are atomic
 * (temp file + rename) so a crash never leaves a truncated JSON behind.
 */
export class RuntimeSettingsFile {
  constructor(private readonly filePath: string) {}

  read(): PersistedRuntimeSettings {
    let text: string
    try {
      text = readFileSync(this.filePath, 'utf8')
    } catch {
      return {}
    }
    try {
      return normalizeRuntimeSettings(JSON.parse(text))
    } catch {
      return {}
    }
  }

  write(settings: PersistedRuntimeSettings): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    writeFileSync(temp, JSON.stringify(settings, null, 2) + '\n', 'utf8')
    renameSync(temp, this.filePath)
  }
}

export type UpdateValidation =
  | { ok: true; patch: Required<Pick<LanProxyUpdatePayload, 'listenPort' | 'upstreamPort' | 'username' | 'password'>> & LanProxyUpdatePayload }
  | { ok: false; message: string }

const MAX_USERNAME_LENGTH = 64
const MAX_PASSWORD_LENGTH = 128

/**
 * Validate an update payload from the settings page.
 * @param payload - the raw RPC payload.
 * @param currentListenPort - the proxy's current listen port.
 * @param currentUpstreamPort - the current forward-target (default service) port.
 * @returns the normalized patch, or a user-facing rejection message.
 */
export function validateUpdate(
  payload: unknown,
  currentListenPort: number,
  currentUpstreamPort: number,
): UpdateValidation {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, message: '请求体必须是对象' }
  }
  const input = payload as Record<string, unknown>
  const patch: LanProxyUpdatePayload = {}

  if (input.listenPort !== undefined) {
    const port = input.listenPort
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, message: `代理服务端口无效：${String(port)}（需要 1–65535 的整数）` }
    }
    if (port === currentUpstreamPort) {
      return { ok: false, message: `代理服务端口不能与默认服务端口相同（都是 ${port}）` }
    }
    patch.listenPort = port
  }

  // Deprecated forward-target patch, accepted for legacy persisted configs
  // and scripts; the settings page no longer edits this port.
  if (input.upstreamPort !== undefined) {
    const port = input.upstreamPort
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, message: `转发目标端口无效：${String(port)}（需要 1–65535 的整数）` }
    }
    if (port === currentListenPort) {
      return { ok: false, message: `转发目标端口不能与代理服务端口相同（都是 ${port}）` }
    }
    patch.upstreamPort = port
  }

  if (input.username !== undefined) {
    if (typeof input.username !== 'string') return { ok: false, message: '用户名必须是字符串' }
    if (input.username.length > MAX_USERNAME_LENGTH) {
      return { ok: false, message: `用户名过长（最多 ${MAX_USERNAME_LENGTH} 个字符）` }
    }
    patch.username = input.username
  }

  if (input.password !== undefined) {
    if (typeof input.password !== 'string') return { ok: false, message: '密码必须是字符串' }
    if (input.password.length > MAX_PASSWORD_LENGTH) {
      return { ok: false, message: `密码过长（最多 ${MAX_PASSWORD_LENGTH} 个字符）` }
    }
    patch.password = input.password
  }

  if (patch.listenPort === undefined && patch.upstreamPort === undefined && patch.username === undefined && patch.password === undefined) {
    return { ok: false, message: '没有可保存的修改' }
  }
  return {
    ok: true,
    patch: patch as Required<Pick<LanProxyUpdatePayload, 'listenPort' | 'upstreamPort' | 'username' | 'password'>> & LanProxyUpdatePayload,
  }
}
