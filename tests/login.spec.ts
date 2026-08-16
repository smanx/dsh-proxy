import { describe, expect, it } from 'vitest'
import { loginPage, parseUrlencoded } from '../src/login.ts'
import { RANDOM_UUID_POLYFILL, injectPolyfill } from '../src/polyfill.ts'

describe('parseUrlencoded', () => {
  it('parses simple pairs', () => {
    expect(parseUrlencoded('username=admin&password=s3cret')).toEqual({
      username: 'admin',
      password: 's3cret',
    })
  })

  it('decodes plus signs and percent escapes', () => {
    expect(parseUrlencoded('a=hello+world&b=%E4%B8%AD%E6%96%87')).toEqual({
      a: 'hello world',
      b: '中文',
    })
  })

  it('handles a bare key and empty body', () => {
    expect(parseUrlencoded('flag')).toEqual({ flag: '' })
    expect(parseUrlencoded('')).toEqual({})
  })

  it('survives malformed percent escapes', () => {
    expect(parseUrlencoded('a=%E4%B8%ZZ&b=ok')).toEqual({ a: '%E4%B8%ZZ', b: 'ok' })
  })
})

describe('loginPage', () => {
  it('renders the form with the session hint', () => {
    const html = loginPage(false, 12)
    expect(html).toContain('name="username"')
    expect(html).toContain('type="password"')
    expect(html).toContain('action="/login"')
    expect(html).toContain('12 小时')
    expect(html).not.toContain('用户名或密码错误')
  })

  it('shows the error banner when requested', () => {
    expect(loginPage(true, 12)).toContain('用户名或密码错误')
  })
})

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
