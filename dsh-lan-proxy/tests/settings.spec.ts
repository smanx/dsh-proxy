import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RuntimeSettingsFile, normalizeRuntimeSettings, validateUpdate } from '../src/settings.ts'

const dirs: string[] = []

function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lan-proxy-settings-'))
  dirs.push(dir)
  return join(dir, 'dsh-lan-proxy.json')
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('normalizeRuntimeSettings', () => {
  it('reads a well-formed object', () => {
    expect(normalizeRuntimeSettings({ listenPort: 3081, upstreamPort: 8080, username: 'a', password: 'b' })).toEqual({
      listenPort: 3081,
      upstreamPort: 8080,
      username: 'a',
      password: 'b',
    })
  })

  it('drops malformed fields', () => {
    expect(normalizeRuntimeSettings({ listenPort: '3081', upstreamPort: '8080', username: 5, password: null })).toEqual({})
    expect(normalizeRuntimeSettings({ listenPort: 3.14 })).toEqual({})
  })

  it('tolerates non-objects', () => {
    expect(normalizeRuntimeSettings(null)).toEqual({})
    expect(normalizeRuntimeSettings('nope')).toEqual({})
  })
})

describe('RuntimeSettingsFile', () => {
  it('round-trips settings and creates parent directories', () => {
    const file = tempFile()
    const store = new RuntimeSettingsFile(file)
    expect(store.read()).toEqual({})
    store.write({ upstreamPort: 9090, username: 'alice', password: 'pw' })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ upstreamPort: 9090, username: 'alice', password: 'pw' })
    expect(store.read()).toEqual({ upstreamPort: 9090, username: 'alice', password: 'pw' })
  })

  it('returns {} for a missing or corrupt file', () => {
    const missing = new RuntimeSettingsFile(join(tempFile(), 'nope', 'x.json'))
    expect(missing.read()).toEqual({})

    const corrupt = tempFile()
    writeFileSync(corrupt, '{not json', 'utf8')
    expect(new RuntimeSettingsFile(corrupt).read()).toEqual({})
  })
})

describe('validateUpdate', () => {
  it('accepts a full patch', () => {
    const out = validateUpdate({ listenPort: 3091, username: 'bob', password: 'x' }, 3081, 3080)
    expect(out).toEqual({ ok: true, patch: { listenPort: 3091, username: 'bob', password: 'x' } })
  })

  it('accepts partial patches', () => {
    expect(validateUpdate({ username: 'bob' }, 3081, 3080)).toEqual({ ok: true, patch: { username: 'bob' } })
    expect(validateUpdate({ password: '' }, 3081, 3080)).toEqual({ ok: true, patch: { password: '' } })
  })

  it('rejects invalid or conflicting listen ports', () => {
    expect(validateUpdate({ listenPort: 0 }, 3081, 3080)).toMatchObject({ ok: false })
    expect(validateUpdate({ listenPort: 70000 }, 3081, 3080)).toMatchObject({ ok: false })
    expect(validateUpdate({ listenPort: 3.5 }, 3081, 3080)).toMatchObject({ ok: false })
    expect(validateUpdate({ listenPort: '3081' }, 3081, 3080)).toMatchObject({ ok: false })
    const conflict = validateUpdate({ listenPort: 3080 }, 3081, 3080)
    expect(conflict.ok).toBe(false)
    if (!conflict.ok) expect(conflict.message).toContain('不能与默认服务端口相同')
  })

  it('still accepts the deprecated forward-target patch with its own conflict rule', () => {
    const legacy = validateUpdate({ upstreamPort: 3090, username: 'bob' }, 3081, 3080)
    expect(legacy).toEqual({ ok: true, patch: { upstreamPort: 3090, username: 'bob' } })
    const conflict = validateUpdate({ upstreamPort: 3081 }, 3081, 3080)
    expect(conflict.ok).toBe(false)
    if (!conflict.ok) expect(conflict.message).toContain('不能与代理服务端口相同')
  })

  it('rejects non-object payloads, non-string credentials, and empty patches', () => {
    expect(validateUpdate(null, 3081, 3080).ok).toBe(false)
    expect(validateUpdate('x', 3081, 3080).ok).toBe(false)
    expect(validateUpdate({ username: 5 }, 3081, 3080).ok).toBe(false)
    expect(validateUpdate({ password: {} }, 3081, 3080).ok).toBe(false)
    expect(validateUpdate({}, 3081, 3080).ok).toBe(false)
  })

  it('caps credential length', () => {
    expect(validateUpdate({ username: 'a'.repeat(65) }, 3081, 3080).ok).toBe(false)
    expect(validateUpdate({ password: 'b'.repeat(129) }, 3081, 3080).ok).toBe(false)
  })
})
