# dsh-lan-proxy

A DeepSeek Harness plugin that exposes the local DSH web app (default `127.0.0.1:3080`) on a **second, authenticated port** for LAN access.

- **HTTP + WebSocket reverse proxy** — real-time streams keep working.
- **Web-based auth** — a self-contained login page issues an HMAC-signed, expiring session cookie (`HttpOnly`, `SameSite=Lax`); HTTP Basic Auth remains as a fallback for scripts and WebSocket clients.
- **Out-of-the-box compatibility fixes** — `Host`/`Origin` rewriting (passes the DSH `/api` same-origin trust fence from the LAN) and a `crypto.randomUUID` polyfill injected into proxied HTML (non-secure LAN contexts lack it, which would break every RPC).
- **Lives inside `dsh web`** — no separate process; configured through the profile's `cordis.patch.yml`.

> Why: the DSH web server deliberately refuses `--host 0.0.0.0` (it would expose remote code execution to the network). This plugin is the sanctioned way out: a separate authenticated listener that proxies back to loopback.
>
> The standalone (Go/Node single-file, no DSH required) lives at <https://github.com/smanx/dsh-proxy>; this is its integrated sibling.

## Install

```bash
dsh plugin --profile web add file:C:/mydata/codes/dsh-lan-proxy
```

Then **restart `dsh web`**. If port 3081 is taken (e.g. the standalone dsh-proxy is still running), stop it first or change `listenPort` below.

## Configuration

All knobs have schema defaults; override them in the **profile's `cordis.patch.yml`** (a patch replaces the row's whole config, so restate every key you change):

```yaml
# C:\Users\cc\.dsh\profiles\web\cordis.patch.yml
- id: dsh-lan-proxy
  config:
    listenHost: '0.0.0.0'      # bind interface; 0.0.0.0 = LAN reachable
    listenPort: 3081            # proxy port (default 3081)
    upstreamHost: '127.0.0.1'   # upstream DSH host
    upstreamPort: 0             # 0 = follow the web app's actual bound port
    username: admin             # login username
    password: admin             # login password
    sessionTtlHours: 12         # session cookie lifetime (hours)
```

- Setting **both** `username` and `password` empty disables auth entirely (open LAN access — not recommended).
- The session secret is generated per process: **restarting `dsh web` invalidates all sessions**, so users simply log in again.

## Usage

1. Restart `dsh web`; the startup log prints the URLs:
   ```
   dsh-lan-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-lan-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. Browse to `http://<your-LAN-IP>:3081` → login page → the DSH UI.

> Windows Firewall: if LAN devices cannot connect, allow the port (admin PowerShell):
> `netsh advfirewall firewall add rule name="dsh-lan-proxy" dir=in action=allow protocol=TCP localport=3081`

## Development

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # full live smoke test against a running DSH on 127.0.0.1:3080
```

- `src/proxy.ts` — the pure-node proxy core (no cordis, independently testable); `src/index.ts` — the cordis plugin entry.
- `lib/` — committed build artifact; `lib/index.cjs` is a fully self-contained single file (schemastery and http-proxy inlined), so the profile needs no extra runtime dependencies.
- `tests/` — vitest: auth primitives, pure functions, and integration tests against a real in-process upstream (HTTP + WebSocket).

## Security notes

- Once authenticated, DSH's `/api` trust fence sees the rewritten loopback `Host`, so **privileged RPCs (settings/credentials) are reachable from the LAN** — the login/Basic gate is the only barrier. Use a strong password and keep auth enabled.
- Sessions rotate on server restart by design, keeping leaked cookies short-lived.
