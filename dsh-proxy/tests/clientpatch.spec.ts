import { describe, expect, it } from 'vitest'
import {
  LOOPBACK_TRUST_PATCHES,
  isJavaScriptContentType,
  patchClientScript,
} from '../src/clientpatch.ts'

const CONNECTION_NEEDLE =
  'isLoopback: pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),'
const SETTINGS_NEEDLE = 'connection.isLoopback ? "host" : "memory"'

describe('isJavaScriptContentType', () => {
  it('matches the javascript content types the harness serves', () => {
    expect(isJavaScriptContentType('text/javascript; charset=utf-8')).toBe(true)
    expect(isJavaScriptContentType('application/javascript')).toBe(true)
    expect(isJavaScriptContentType('Application/Javascript')).toBe(true)
  })

  it('rejects non-script payloads', () => {
    expect(isJavaScriptContentType('text/html; charset=utf-8')).toBe(false)
    expect(isJavaScriptContentType('application/json')).toBe(false)
    expect(isJavaScriptContentType('image/svg+xml')).toBe(false)
    expect(isJavaScriptContentType('')).toBe(false)
  })
})

describe('patchClientScript', () => {
  it('rewrites the connection bundle isLoopback derivation to true', () => {
    const code = `var x=1;{api,isLoopback: pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),hostDescription:{}}`
    const { code: out, matched } = patchClientScript(code)
    expect(out).toBe('var x=1;{api,isLoopback: true,hostDescription:{}}')
    expect(matched).toEqual(['connection.isLoopback (settings mirror stays unavailable)'])
  })

  it('rewrites every settings mirror persistence site at once', () => {
    const code = `new SettingsDescribeMirror(connection.api, ${SETTINGS_NEEDLE});bind(x, ${SETTINGS_NEEDLE})`
    const { code: out, matched } = patchClientScript(code)
    expect(out).toBe('new SettingsDescribeMirror(connection.api, "host");bind(x, "host")')
    expect(out).not.toContain(SETTINGS_NEEDLE)
    expect(matched).toEqual(['settings describe mirror persistence'])
  })

  it('applies both needles in one pass when a body carries them', () => {
    const { matched } = patchClientScript(`${CONNECTION_NEEDLE} ${SETTINGS_NEEDLE}`)
    expect(matched).toHaveLength(2)
  })

  it('leaves bodies without the needles byte-identical (vendor bundles)', () => {
    const code = 'console.log("vendor chunk");export default 42'
    const { code: out, matched } = patchClientScript(code)
    expect(out).toBe(code)
    expect(matched).toEqual([])
  })
})

describe('LOOPBACK_TRUST_PATCHES', () => {
  it('carries non-empty exact needles with distinct purposes', () => {
    for (const patch of LOOPBACK_TRUST_PATCHES) {
      expect(patch.needle.length).toBeGreaterThan(10)
      expect(patch.replacement.length).toBeGreaterThan(0)
      expect(patch.purpose).toMatch(/\S/)
    }
  })
})
