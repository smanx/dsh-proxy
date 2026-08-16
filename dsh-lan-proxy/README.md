# dsh-lan-proxy

A DeepSeek Harness plugin that exposes the local DSH web app (default `127.0.0.1:3080`) on a **second, authenticated port** for LAN access.

- **HTTP + WebSocket reverse proxy** — real-time streams keep working.
- **Native Basic Auth (off by default)** — the same model as the standalone dsh-proxy: the **browser's own credential dialog**, no custom login page, no session cookies. Username and password default to empty (open LAN access); setting **both** in the settings page turns password login on, after which unauthenticated requests are answered with `401 + WWW-Authenticate: Basic` and the browser pops its native dialog. After a successful login the browser caches the credentials for the origin and sends them automatically (including on WebSocket handshakes).
- **Settings page** — DSH settings → "LAN Proxy": shows the running ports and whether password login is enabled, **starts/stops the proxy**, and edits the proxy listen port, username, and password; saving persists the patch to `$DSH_HOME/dsh-lan-proxy.json` and immediately restarts the forwarding service.
- **Out-of-the-box compatibility fixes** — `Host`/`Origin` rewriting (passes the DSH `/api` same-origin trust fence from the LAN) and a `crypto.randomUUID` polyfill injected into proxied HTML (non-secure LAN contexts lack it, which would break every RPC).
- **Lives inside `dsh web`** — no separate process; configured through the profile's `cordis.patch.yml`.

> Why: the DSH web server deliberately refuses `--host 0.0.0.0` (it would expose remote code execution to the network). This plugin is the sanctioned way out: a separate authenticated listener that proxies back to loopback.
>
> The standalone (Go/Node single-file, no DSH required) lives at <https://github.com/smanx/dsh-proxy>; this is its integrated sibling with the same native-Basic-Auth model.

## Install

**Online install (recommended)** — directly from GitHub, no need to download the repository:

```bash
dsh plugin --profile web add github:smanx/dsh-proxy#master
```

**Local install** (repository cloned/downloaded on this machine):

```bash
dsh plugin --profile web add file:C:/mydata/codes/dsh-proxy
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
    username: ''                # login username (default empty = password login off)
    password: ''                # login password (default empty = password login off)
```

- Default `username` and `password` are both empty = **password login off** (open LAN access — not recommended). Password login turns on **only when both are set**; setting just one keeps it off (the settings page warns).

## Settings page (port / credentials / start-stop)

After restarting `dsh web`, open DSH settings (gear icon) → "LAN Proxy":

- **Status**: two red/green running lights — the **proxy port** (listen address:port; green = the proxy is actually bound, red = bind failed e.g. port busy) and the **default service port** (DSH service port; green = the default service answers a probe, red = unreachable) — plus the current username and whether password login is enabled. A **Start/Stop** button pair sits in the card header: Start is grayed out while running, Stop is grayed out while stopped.
- **Edit settings**: change the **proxy listen port**, **username**, and **password** (leave empty to set blank). "Apply" writes `$DSH_HOME/dsh-lan-proxy.json` and **immediately restarts the forwarding service**; changing the listen port moves the LAN access address.

Settings-page changes persist and take precedence over the profile's `cordis.patch.yml`; `listenHost` / `listenPort` remain cordis-only. The page talks to the host through the `/dsh-lan-proxy` Connection RPC channel (`status` / `update` / `start` / `stop`), scoped to loopback authority (still reachable from the LAN via the proxy's Host rewrite).

## Usage

1. Restart `dsh web`; the startup log prints the URLs:
   ```
   dsh-lan-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-lan-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. Browse to `http://<your-LAN-IP>:3081` → the browser shows its **native Basic Auth dialog** → enter the credentials → the DSH UI loads. The browser remembers the credentials, so subsequent visits open directly.

> Windows Firewall: if LAN devices cannot connect, allow the port (admin PowerShell):
> `netsh advfirewall firewall add rule name="dsh-lan-proxy" dir=in action=allow protocol=TCP localport=3081`

## Development

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # full live smoke test against a running DSH on 127.0.0.1:3080
```

- `src/` — TypeScript source. `src/proxy.ts` is the pure-node proxy core (no cordis, independently testable); `src/controller.ts` is the proxy controller (start/stop/restart/status/update plus settings persistence); `src/index.ts` is the cordis plugin entry (including the `/dsh-lan-proxy` RPC channel); `src/client/` is the browser settings section.
- `lib/` — committed build artifacts; `lib/index.cjs` is a fully self-contained host bundle (schemastery, http-proxy, dsh-home-paths inlined) and `lib/client.js` the browser bundle (react only external).
- `tests/` — vitest: auth primitives, pure functions, proxy integration (HTTP + WebSocket), the controller against a real in-process upstream with a temp settings file, and a jsdom render of the settings section.

## Authentication details

- **Enablement**: password login is active only when `username` AND `password` are both non-empty (defaults are empty = open access); setting just one keeps it off.
- **Mechanism**: HTTP Basic Auth via the browser's native dialog — every unauthenticated request (page, `/api/*`, scripts) gets `401 + WWW-Authenticate: Basic realm="dsh-lan-proxy"`; WebSocket rejections carry the same header. There is **no custom login page and no session cookie**; after a successful login the browser caches the credentials per origin and sends them automatically (including on WebSocket handshakes).
- **Public static files**: `/manifest.webmanifest` and `/favicon.svg` bypass the gate — browsers fetch them in credential-less contexts (PWA manifest, favicon), so requiring authentication would 401 them. They carry no secrets.
- Credential comparison is constant-time (`timingSafeEqual`).

## Security notes

- **The LAN surface is OPEN by default** (empty username/password). Set **both** credentials in the settings page as soon as possible.
- Once password login is enabled, DSH's `/api` trust fence sees the rewritten loopback `Host`, so **privileged RPCs (settings/credentials) are reachable from the LAN** — the Basic Auth gate is the only barrier.
- Browser-cached Basic credentials are NOT invalidated by a password change: the old credentials get a 401 and the dialog reappears; enter the new password. To fully clear them, remove the site's saved password in the browser.
