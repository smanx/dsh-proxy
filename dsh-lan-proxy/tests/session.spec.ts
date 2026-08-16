import { describe, expect, it } from 'vitest'
import { Authenticator, checkBasicAuth, safeEqual } from '../src/session.ts'

const CONFIG = { username: 'admin', password: 's3cret' }

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

describe('Authenticator (Basic Auth only)', () => {
  it('opens the gate when both credentials are empty', () => {
    const auth = new Authenticator({ username: '', password: '' })
    expect(auth.enabled).toBe(false)
    expect(auth.isAuthenticated(undefined)).toBe(true)
  })

  it('stays disabled when only one credential is set (both are required)', () => {
    const onlyUser = new Authenticator({ username: 'admin', password: '' })
    expect(onlyUser.enabled).toBe(false)
    expect(onlyUser.isAuthenticated(undefined)).toBe(true)

    const onlyPass = new Authenticator({ username: '', password: 'pw' })
    expect(onlyPass.enabled).toBe(false)
    expect(onlyPass.isAuthenticated(undefined)).toBe(true)
  })

  it('enables the gate only when both credentials are set', () => {
    const auth = new Authenticator(CONFIG)
    expect(auth.enabled).toBe(true)
    expect(auth.isAuthenticated(undefined)).toBe(false)
  })

  it('accepts a valid Basic header and rejects anonymous requests', () => {
    const auth = new Authenticator(CONFIG)
    const header = `Basic ${Buffer.from('admin:s3cret').toString('base64')}`
    expect(auth.isAuthenticated(header)).toBe(true)
    expect(auth.isAuthenticated(`Basic ${Buffer.from('admin:wrong').toString('base64')}`)).toBe(false)
  })
})
