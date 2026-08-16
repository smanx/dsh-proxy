import { describe, expect, it } from 'vitest'
import {
  Authenticator,
  SESSION_COOKIE,
  SessionStore,
  checkBasicAuth,
  readSessionCookie,
  safeEqual,
} from '../src/session.ts'

const CONFIG = { username: 'admin', password: 's3cret', sessionTtlSeconds: 3600 }

describe('safeEqual', () => {
  it('accepts identical strings', () => {
    expect(safeEqual('admin', 'admin')).toBe(true)
  })

  it('rejects differing strings of equal length', () => {
    expect(safeEqual('admin', 'admim')).toBe(false)
  })

  it('rejects differing lengths', () => {
    expect(safeEqual('admin', 'adminx')).toBe(false)
  })

  it('rejects empty vs non-empty', () => {
    expect(safeEqual('', 'x')).toBe(false)
  })
})

describe('SessionStore', () => {
  it('round-trips a valid token and recovers the username', () => {
    const store = new SessionStore(CONFIG)
    const token = store.issue('alice', Date.parse('2026-01-01T00:00:00Z'))
    const result = store.verify(token, Date.parse('2026-01-01T00:30:00Z'))
    expect(result).toEqual({ ok: true, username: 'alice' })
  })

  it('keeps usernames containing dots intact', () => {
    const store = new SessionStore(CONFIG)
    const token = store.issue('a.b@c.d', Date.parse('2026-01-01T00:00:00Z'))
    expect(store.verify(token, Date.parse('2026-01-01T00:30:00Z'))).toEqual({
      ok: true,
      username: 'a.b@c.d',
    })
  })

  it('rejects expired tokens', () => {
    const store = new SessionStore(CONFIG)
    const issued = Date.parse('2026-01-01T00:00:00Z')
    const token = store.issue('alice', issued)
    const result = store.verify(token, issued + 3600_001)
    expect(result).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects tokens at the exact expiry boundary', () => {
    const store = new SessionStore(CONFIG)
    const issued = Date.parse('2026-01-01T00:00:00Z')
    const token = store.issue('alice', issued)
    expect(store.verify(token, issued + 3600_000)).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects tampered signatures', () => {
    const store = new SessionStore(CONFIG)
    const token = store.issue('alice')
    const [payload, sig] = token.split('.')
    // Flip the FIRST character of the signature: every bit of it is
    // significant. (Flipping the last base64url character can touch only
    // padding bits, which decode to the same bytes — a latent flake.)
    const tampered = `${payload}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`
    expect(tampered).not.toBe(token)
    expect(store.verify(tampered)).toEqual({ ok: false, reason: 'tampered' })
  })

  it('rejects payload tampering (different username, same expiry)', () => {
    const store = new SessionStore(CONFIG)
    const token = store.issue('alice', Date.parse('2026-01-01T00:00:00Z'))
    const [payload] = token.split('.')
    const text = Buffer.from(payload, 'base64url').toString('utf8') // exp.alice
    const forged = Buffer.from(text.replace('alice', 'root')).toString('base64url')
    expect(store.verify(`${forged}.${token.split('.')[1]}`)).toEqual({ ok: false, reason: 'tampered' })
  })

  it('rejects malformed tokens', () => {
    const store = new SessionStore(CONFIG)
    expect(store.verify('')).toEqual({ ok: false, reason: 'malformed' })
    expect(store.verify('nodots')).toEqual({ ok: false, reason: 'malformed' })
    expect(store.verify('a.')).toEqual({ ok: false, reason: 'malformed' })
    expect(store.verify('a.b.c')).toEqual({ ok: false, reason: 'malformed' })
  })

  it('tokens from one store fail in another (secret rotation)', () => {
    const a = new SessionStore(CONFIG)
    const b = new SessionStore(CONFIG)
    expect(b.verify(a.issue('alice'))).toEqual({ ok: false, reason: 'tampered' })
  })
})

describe('readSessionCookie', () => {
  it('extracts the session cookie from a multi-cookie header', () => {
    const header = `other=1; ${SESSION_COOKIE}=abc123; third=2`
    expect(readSessionCookie(header)).toBe('abc123')
  })

  it('returns null without a cookie header or match', () => {
    expect(readSessionCookie(undefined)).toBeNull()
    expect(readSessionCookie('other=1')).toBeNull()
  })
})

describe('checkBasicAuth', () => {
  const header = (user: string, pass: string): string =>
    `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`

  it('accepts the right pair', () => {
    expect(checkBasicAuth(header('admin', 's3cret'), 'admin', 's3cret')).toBe(true)
  })

  it('rejects a wrong password or username', () => {
    expect(checkBasicAuth(header('admin', 'nope'), 'admin', 's3cret')).toBe(false)
    expect(checkBasicAuth(header('root', 's3cret'), 'admin', 's3cret')).toBe(false)
  })

  it('rejects missing or malformed headers', () => {
    expect(checkBasicAuth(undefined, 'admin', 's3cret')).toBe(false)
    expect(checkBasicAuth('Basic !!!not-base64!!!', 'admin', 's3cret')).toBe(false)
    expect(checkBasicAuth('Basic ' + Buffer.from('nocolon').toString('base64'), 'admin', 's3cret')).toBe(false)
  })

  it('tolerates credentials containing colons (split on the first)', () => {
    expect(checkBasicAuth(header('admin', 'a:b:c'), 'admin', 'a:b:c')).toBe(true)
  })
})

describe('Authenticator', () => {
  it('accepts a valid session cookie', () => {
    const auth = new Authenticator(CONFIG)
    const token = auth.sessions.issue('admin')
    expect(auth.isAuthenticated(`${SESSION_COOKIE}=${token}`, undefined)).toBe(true)
  })

  it('accepts Basic Auth', () => {
    const auth = new Authenticator(CONFIG)
    const header = `Basic ${Buffer.from('admin:s3cret').toString('base64')}`
    expect(auth.isAuthenticated(undefined, header)).toBe(true)
  })

  it('rejects anonymous requests when enabled', () => {
    const auth = new Authenticator(CONFIG)
    expect(auth.isAuthenticated(undefined, undefined)).toBe(false)
  })

  it('opens the gate when both credentials are empty', () => {
    const auth = new Authenticator({ username: '', password: '', sessionTtlSeconds: 3600 })
    expect(auth.enabled).toBe(false)
    expect(auth.isAuthenticated(undefined, undefined)).toBe(true)
  })

  it('stays disabled when only one credential is set (both are required)', () => {
    const onlyUser = new Authenticator({ username: 'admin', password: '', sessionTtlSeconds: 3600 })
    expect(onlyUser.enabled).toBe(false)
    expect(onlyUser.isAuthenticated(undefined, undefined)).toBe(true)

    const onlyPass = new Authenticator({ username: '', password: 'pw', sessionTtlSeconds: 3600 })
    expect(onlyPass.enabled).toBe(false)
    expect(onlyPass.isAuthenticated(undefined, undefined)).toBe(true)
  })

  it('enables the gate only when both credentials are set', () => {
    const auth = new Authenticator({ username: 'admin', password: 'pw', sessionTtlSeconds: 3600 })
    expect(auth.enabled).toBe(true)
    expect(auth.isAuthenticated(undefined, undefined)).toBe(false)
  })
})
