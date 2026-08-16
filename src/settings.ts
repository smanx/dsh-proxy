/**
 * Persisted runtime settings for the LAN proxy: a small JSON file under the
 * DSH home that overlays the cordis config. The settings page writes here so
 * changes survive `dsh web` restarts; the file is the single source of truth
 * for the runtime overrides (upstream port, username, password).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { LanProxyUpdatePayload } from './contract.ts'

/** The on-disk shape (a subset of the update payload; no derived fields). */
export interface PersistedRuntimeSettings {
  upstreamPort?: number
  username?: string
  password?: string
}

/** Tolerant read of an unknown JSON value into the persisted shape. */
export function normalizeRuntimeSettings(raw: unknown): PersistedRuntimeSettings {
  if (typeof raw !== 'object' || raw === null) return {}
  const source = raw as Record<string, unknown>
  const out: PersistedRuntimeSettings = {}
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
  | { ok: true; patch: Required<Pick<LanProxyUpdatePayload, 'upstreamPort' | 'username' | 'password'>> & LanProxyUpdatePayload }
  | { ok: false; message: string }

const MAX_USERNAME_LENGTH = 64
const MAX_PASSWORD_LENGTH = 128

/**
 * Validate an update payload from the settings page.
 * @param payload - the raw RPC payload.
 * @param listenPort - the proxy's listen port (upstream must differ from it).
 * @returns the normalized patch, or a user-facing rejection message.
 */
export function validateUpdate(payload: unknown, listenPort: number): UpdateValidation {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, message: '请求体必须是对象' }
  }
  const input = payload as Record<string, unknown>
  const patch: LanProxyUpdatePayload = {}

  if (input.upstreamPort !== undefined) {
    const port = input.upstreamPort
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, message: `转发目标端口无效：${String(port)}（需要 1–65535 的整数）` }
    }
    if (port === listenPort) {
      return { ok: false, message: `转发目标端口不能与监听端口相同（都是 ${port}）` }
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

  if (patch.upstreamPort === undefined && patch.username === undefined && patch.password === undefined) {
    return { ok: false, message: '没有可保存的修改' }
  }
  return {
    ok: true,
    patch: patch as Required<Pick<LanProxyUpdatePayload, 'upstreamPort' | 'username' | 'password'>> & LanProxyUpdatePayload,
  }
}
