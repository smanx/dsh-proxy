/**
 * The self-contained login page served by the proxy (no external assets), and
 * a tolerant urlencoded form parser. The page is deliberately dependency-free
 * so it works even when the upstream DSH app is down.
 */

/** Render the login page. `error` shows the failed-login banner. */
export function loginPage(error: boolean, sessionTtlHours: number): string {
  const banner = error
    ? '<div class="error">用户名或密码错误，请重试。</div>'
    : ''
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DSH 局域网访问</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0d1117;
        color: #e6edf3;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      }
      .card {
        width: min(92vw, 360px);
        padding: 32px 28px;
        border: 1px solid #2d333b;
        border-radius: 12px;
        background: #161b22;
        box-shadow: 0 8px 32px rgba(0, 0, 0, .4);
      }
      h1 { margin: 0 0 4px; font-size: 20px; }
      .sub { margin: 0 0 20px; color: #8b949e; font-size: 13px; }
      label { display: block; margin: 14px 0 6px; font-size: 13px; color: #c9d1d9; }
      input {
        width: 100%;
        padding: 9px 11px;
        border: 1px solid #30363d;
        border-radius: 8px;
        background: #0d1117;
        color: #e6edf3;
        font-size: 14px;
      }
      input:focus { outline: none; border-color: #2f81f7; }
      button {
        width: 100%;
        margin-top: 22px;
        padding: 10px;
        border: 0;
        border-radius: 8px;
        background: #2f81f7;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
      }
      button:hover { background: #388bfd; }
      .error {
        margin-bottom: 14px;
        padding: 9px 11px;
        border: 1px solid #f85149;
        border-radius: 8px;
        background: rgba(248, 81, 73, .12);
        color: #ff7b72;
        font-size: 13px;
      }
      .hint { margin-top: 18px; color: #8b949e; font-size: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <form class="card" method="post" action="/login">
      <h1>DeepSeek Harness</h1>
      <p class="sub">局域网访问需登录</p>
      ${banner}
      <label for="username">用户名</label>
      <input id="username" name="username" autocomplete="username" required autofocus />
      <label for="password">密码</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">登录</button>
      <p class="hint">会话有效期 ${sessionTtlHours} 小时；代理服务重启后需重新登录。</p>
    </form>
  </body>
</html>
`
}

/**
 * Parse an application/x-www-form-urlencoded body. Malformed percent
 * sequences decode to the empty string instead of throwing.
 */
export function parseUrlencoded(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of body.split('&')) {
    if (pair === '') continue
    const eq = pair.indexOf('=')
    const rawKey = eq === -1 ? pair : pair.slice(0, eq)
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1)
    let key: string
    let value: string
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, ' '))
      value = decodeURIComponent(rawValue.replace(/\+/g, ' '))
    } catch {
      key = rawKey
      value = rawValue
    }
    out[key] = value
  }
  return out
}
