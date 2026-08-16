/**
 * Authentication primitives for the LAN proxy: an expiring, HMAC-signed
 * session cookie is the primary web-based gate, with HTTP Basic Auth as the
 * fallback for scripts and WebSocket clients that cannot run a login flow.
 * Everything here is pure and unit-tested — no sockets, no cordis.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Name of the session cookie the login flow sets. */
export const SESSION_COOKIE = 'dsh_lan_session'

export interface SessionConfig {
  /** Basic Auth / login-page username; empty disables the gate together with `password`. */
  username: string
  /** Basic Auth / login-page password; empty disables the gate together with `username`. */
  password: string
  /** Session cookie lifetime in seconds. */
  sessionTtlSeconds: number
}

/** Constant-time string comparison (length mismatch short-circuits). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function hmac(secret: Buffer, payload: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest()
}

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function unb64url(text: string): Buffer | null {
  try {
    return Buffer.from(text, 'base64url')
  } catch {
    return null
  }
}

export type SessionVerification =
  | { ok: true; username: string }
  | { ok: false; reason: 'malformed' | 'expired' | 'tampered' }

/**
 * Issues and verifies session tokens of the form
 * `<base64url(exp.uname)>.<base64url(hmac)>`. The secret is generated per
 * process, so a server restart invalidates every outstanding session (users
 * simply log in again) — deliberate: the proxy holds the whole DSH surface,
 * and rotation on restart keeps leaked cookies short-lived.
 */
export class SessionStore {
  readonly secret = randomBytes(32)

  constructor(private readonly config: SessionConfig) {}

  issue(username: string, now = Date.now()): string {
    const expiresAt = Math.floor(now / 1000) + this.config.sessionTtlSeconds
    const payload = `${expiresAt}.${username}`
    return `${b64url(payload)}.${b64url(hmac(this.secret, payload))}`
  }

  verify(token: string, now = Date.now()): SessionVerification {
    const dot = token.lastIndexOf('.')
    if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: 'malformed' }
    const payload = unb64url(token.slice(0, dot))
    if (payload === null) return { ok: false, reason: 'malformed' }
    const text = payload.toString('utf8')
    const sep = text.indexOf('.')
    if (sep <= 0) return { ok: false, reason: 'malformed' }
    const expiresAt = Number(text.slice(0, sep))
    if (!Number.isFinite(expiresAt)) return { ok: false, reason: 'malformed' }
    const sig = unb64url(token.slice(dot + 1))
    if (sig === null) return { ok: false, reason: 'malformed' }
    const expected = hmac(this.secret, text)
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
      return { ok: false, reason: 'tampered' }
    }
    if (expiresAt <= Math.floor(now / 1000)) return { ok: false, reason: 'expired' }
    return { ok: true, username: text.slice(sep + 1) }
  }
}

/** Extract the session cookie value from a raw Cookie header, or null. */
export function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === SESSION_COOKIE) return part.slice(eq + 1).trim()
  }
  return null
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

/**
 * Combined gate: session cookie OR Basic Auth. Password login is enabled only
 * when BOTH configured credentials are non-empty — setting just one of them
 * leaves the gate open (the settings page warns about this).
 */
export class Authenticator {
  readonly sessions: SessionStore

  constructor(readonly config: SessionConfig) {
    this.sessions = new SessionStore(config)
  }

  /** Password login is active only when both username and password are set. */
  get enabled(): boolean {
    return this.config.username !== '' && this.config.password !== ''
  }

  isAuthenticated(cookieHeader: string | undefined, authorization: string | undefined): boolean {
    if (!this.enabled) return true
    const token = readSessionCookie(cookieHeader)
    if (token !== null && this.sessions.verify(token).ok) return true
    return checkBasicAuth(authorization, this.config.username, this.config.password)
  }
}
