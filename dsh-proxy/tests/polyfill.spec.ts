import { describe, expect, it } from 'vitest'
import { RANDOM_UUID_POLYFILL, injectPolyfill } from '../src/polyfill.ts'

describe('injectPolyfill', () => {
  const DOC = '<!doctype html><html><head><meta charset="utf-8"/><title>t</title></head><body></body></html>'

  it('inserts after the opening head tag', () => {
    const out = injectPolyfill(DOC)
    expect(out.indexOf(RANDOM_UUID_POLYFILL)).toBeGreaterThan(out.indexOf('<head>'))
    expect(out.indexOf(RANDOM_UUID_POLYFILL)).toBeLessThan(out.indexOf('<meta'))
    expect(out.endsWith('</html>')).toBe(true)
  })

  it('handles a head tag with attributes', () => {
    const out = injectPolyfill('<!doctype html><html><head lang="en"><title>x</title></head></html>')
    expect(out.startsWith('<!doctype html><html><head lang="en">' + RANDOM_UUID_POLYFILL)).toBe(true)
  })

  it('prepends when there is no head', () => {
    const out = injectPolyfill('<html><body>hi</body></html>')
    expect(out.startsWith(RANDOM_UUID_POLYFILL)).toBe(true)
  })

  it('respects a custom polyfill payload', () => {
    expect(injectPolyfill(DOC, '<script>custom</script>')).toContain('<script>custom</script>')
  })
})
