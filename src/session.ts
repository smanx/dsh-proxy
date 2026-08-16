/**
 * Authentication primitives for the LAN proxy: HTTP Basic Auth is the entire
 * gate, presented through the browser's NATIVE credential dialog — the same
 * model as the standalone dsh-proxy. There is no custom login page and no
 * session cookie: after a successful Basic login the browser caches the
 * credentials for the origin and silently sends them on every request.
 *
 * Password login is active only when BOTH username and password are
 * configured; with either one empty the LAN surface is open (the settings
 * page warns about this).
 */
import { timingSafeEqual } from 'node:crypto'

/** Credential pair enforced by the proxy (an empty pair = password login off). */
export interface AuthConfig {
  username: string
  password: string
}

/** Constant-time string comparison (length mismatch short-circuits). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Verify an HTTP Basic Authorization header against the configured pair. */
export function checkBasicAuth(
  authorization: string | undefined,
  username: string,
  password: string,
): boolean {
  const match = /^Basic\s+(.+)$/i.exec(authorization ?? '')
  if (!match) return false
  let decoded: string
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8')
  } catch {
    return false
  }
  const sep = decoded.indexOf(':')
  if (sep === -1) return false
  return safeEqual(decoded.slice(0, sep), username) && safeEqual(decoded.slice(sep + 1), password)
}

/** The proxy's gate: Basic Auth only, active when both credentials are set. */
export class Authenticator {
  constructor(readonly config: AuthConfig) {}

  /** Password login is active only when both username and password are set. */
  get enabled(): boolean {
    return this.config.username !== '' && this.config.password !== ''
  }

  isAuthenticated(authorization: string | undefined): boolean {
    if (!this.enabled) return true
    return checkBasicAuth(authorization, this.config.username, this.config.password)
  }
}
