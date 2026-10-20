# dsh-proxy

A DeepSeek Harness plugin that exposes the local DSH web app (default `127.0.0.1:3080`) on a **second, authenticated port** for LAN access.

- **HTTP + WebSocket reverse proxy** — real-time streams keep working.
- **Native Basic Auth (off by default)** — the same model as the standalone dsh-proxy: the **browser's own credential dialog**, no custom login page, no session cookies. Username and password default to empty (open LAN access); setting **both** in the settings page turns password login on, after which unauthenticated requests are answered with `401 + WWW-Authenticate: Basic` and the browser pops its native dialog. After a successful login the browser caches the credentials for the origin and sends them automatically (including on WebSocket handshakes).
- **Settings page** — DSH settings → "LAN Proxy": shows the running ports and whether password login is enabled, **starts/stops the proxy**, and edits the proxy listen port, username, password, and the token-free-login toggle; saving persists the patch to `$DSH_HOME/dsh-proxy.json` and immediately restarts the forwarding service.
- **Optional token-free first visit (off by default)** — DSH 0.2.x gates its web surface behind a per-process launch token that a LAN device never sees, so a first-time browser is locked out at `401 dsh web authentication required`. With this toggle on, the proxy performs the token→cookie exchange on the client's behalf, and every later visit works without the token. Off by default because it makes the proxy port the only barrier (see [Token-free first visit](#token-free-first-visit-skiplaunchtoken)).
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

The installed package is **`@smanx/dsh-proxy`** (scoped, with the username prefix) and shows up as `@smanx/dsh-proxy@0.1.1` in `dsh plugin ls`.

Then **restart `dsh web`**. If port 3081 is taken (e.g. the standalone dsh-proxy is still running), stop it first or change `listenPort` below.

## Configuration

All knobs have schema defaults; override them in the **profile's `cordis.patch.yml`** (a patch replaces the row's whole config, so restate every key you change):

```yaml
# C:\Users\cc\.dsh\profiles\web\cordis.patch.yml
- id: dsh-proxy
  config:
    listenHost: '0.0.0.0'      # bind interface; 0.0.0.0 = LAN reachable
    listenPort: 3081            # proxy port (default 3081)
    upstreamHost: '127.0.0.1'   # upstream DSH host
    upstreamPort: 0             # 0 = follow the web app's actual bound port
    username: ''                # login username (default empty = password login off)
    password: ''                # login password (default empty = password login off)
    skipLaunchToken: false      # token-free first visit (default OFF — see below)
```

- Default `username` and `password` are both empty = **password login off** (open LAN access — not recommended). Password login turns on **only when both are set**; setting just one keeps it off (the settings page warns).
- `skipLaunchToken` (default **false**): see [Token-free first visit](#token-free-first-visit-skiplaunchtoken) below.

## Settings page (port / credentials / start-stop)

After restarting `dsh web`, open DSH settings (gear icon) → "LAN Proxy":

- **Status**: two red/green running lights — the **proxy port** (listen address:port; green = the proxy is actually bound, red = bind failed e.g. port busy) and the **default service port** (DSH service port; green = the default service answers a probe, red = unreachable) — plus the current username, whether password login is enabled, and whether token-free login is enabled ("Disabled" specifically reads *the first visit still needs the token once*). A **Start/Stop** button pair sits in the card header: Start is grayed out while running, Stop is grayed out while stopped.
- **Edit settings**: change the **proxy listen port**, **username**, **password** (leave empty to set blank), and the **token-free login** checkbox (its hint spells out the security trade-off). "Apply" writes `$DSH_HOME/dsh-proxy.json` and **immediately restarts the forwarding service**; changing the listen port moves the LAN access address.

Settings-page changes persist and take precedence over the profile's `cordis.patch.yml`; `listenHost` / `listenPort` remain cordis-only. The page talks to the host through the `/dsh-proxy` Connection RPC channel (`status` / `update` / `start` / `stop`), scoped to loopback authority (still reachable from the LAN via the proxy's Host rewrite).

## Usage

1. Restart `dsh web`; the startup log prints the URLs:
   ```
   dsh-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. Browse to `http://<your-LAN-IP>:3081`.
   - **With password login on** → the browser shows its **native Basic Auth dialog** → enter the credentials → the DSH UI loads. The browser remembers the credentials, so subsequent visits open directly.
   - **With `skipLaunchToken` on** → no token to paste: the first visit is authenticated by the proxy, the browser gets a signed cookie and lands straight in the DSH UI. Every later visit works with no token at all.

> Windows Firewall: if LAN devices cannot connect, allow the port (admin PowerShell):
> `netsh advfirewall firewall add rule name="dsh-proxy" dir=in action=allow protocol=TCP localport=3081`

## Development

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # full live smoke test against a running DSH on 127.0.0.1:3080
```

- `src/` — TypeScript source. `src/proxy.ts` is the pure-node proxy core (no cordis, independently testable); `src/controller.ts` is the proxy controller (start/stop/restart/status/update plus settings persistence); `src/index.ts` is the cordis plugin entry (including the `/dsh-proxy` RPC channel); `src/client/` is the browser settings section.
- `lib/` — committed build artifacts; `lib/index.cjs` is a fully self-contained host bundle (schemastery, http-proxy, dsh-home-paths inlined) and `lib/client.js` the browser bundle (react only external).
- `tests/` — vitest: auth primitives, pure functions, proxy integration (HTTP + WebSocket), the controller against a real in-process upstream with a temp settings file, and a jsdom render of the settings section.

## Authentication details

- **Enablement**: password login is active only when `username` AND `password` are both non-empty (defaults are empty = open access); setting just one keeps it off.
- **Mechanism**: HTTP Basic Auth via the browser's native dialog — every unauthenticated request (page, `/api/*`, scripts) gets `401 + WWW-Authenticate: Basic realm="dsh-proxy"`; WebSocket rejections carry the same header. There is **no custom login page and no session cookie**; after a successful login the browser caches the credentials per origin and sends them automatically (including on WebSocket handshakes).
- **Public static files**: `/manifest.webmanifest` and `/favicon.svg` bypass the gate — browsers fetch them in credential-less contexts (PWA manifest, favicon), so requiring authentication would 401 them. They carry no secrets.
- Credential comparison is constant-time (`timingSafeEqual`).

## Token-free first visit (`skipLaunchToken`)

**What problem this solves.** DSH 0.2.x locks its entire web surface behind a **per-process launch token** — `dsh web` prints a URL like `http://172.28.216.108:3080/?token=HO3B2CzY...` at startup, and a navigation without it gets:

```
401 dsh web authentication required; reopen the URL printed by dsh web.
```

Only `GET /?token=...` converts that token into a **signed 30-day cookie** (`dsh-auth-<authority>`). A LAN device never sees the token, so without help every new browser is stuck on that 401, and somebody has to read the token off the server's startup log and paste it in — once per device, again after every `dsh web` restart.

With `skipLaunchToken: true` the proxy performs **exactly the exchange a browser performs by hand**, on the client's behalf, before the client's own request is forwarded:

1. the proxy probes the upstream with the client's own method, path and headers;
2. if the upstream answers **401** and the client carries **no credential** (no `token` parameter, no `dsh-auth-*` cookie), the proxy appends `?token=...` to the client's URL;
3. DSH then mints the cookie and **303-redirects to `./`** — the browser lands on the app and keeps the cookie for every later request;
4. any other status means the request was fine, so it is forwarded as-is.

**When it acts.** Only a `GET` that carries no token and no `dsh-auth-*` cookie can be upgraded. A request that already has a credential is forwarded untouched, so the proxy never appends a second token (DSH would reject that) and never replays a token onto a state-changing request.

**Why the feature costs nothing when off.** With the flag off (the default) the hot path is a single boolean property read per request — the probe never runs and the request is forwarded exactly as before.

**The token is never persisted.** It is read from the host's Connection service (`ctx.connection.authenticatedUrl()`), the same value `dsh web` prints at startup, **when the forwarding service starts** — not at plugin load, because `BrowserAuth` only exists once the harness is serving. Only the *flag* is persisted (`$DSH_HOME/dsh-proxy.json`); the token is re-read on every start, so it tracks restarts automatically. If the host cannot supply a token the feature stays inert, a warning is logged, and the proxy behaves exactly as before.

**Turning it on.** Either in `cordis.patch.yml` (above) or in the settings page's **Token-free login** checkbox. The settings page writes the flag, restarts the forwarding service and takes effect **without restarting `dsh web`**. Turning it **off** clears the cached token immediately.

**What it does not cover.** The auto-login only runs on the plain HTTP request path. **WebSocket upgrades are not upgraded**: `GET /?token=...` is a browser navigation, so a raw WS handshake still needs the version-2 API cookie minted by `/connect?token=...`. With the flag on, the page loads and the browser holds the cookie, but a WS client connecting with no cookie at all will still get 401 — same as before this feature.

**Security trade-off.** With this on, **any device that can reach the proxy port is admitted by DSH without the launch token**. Treat it as equivalent to running the proxy with no DSH-side authentication, leaving the proxy's own Basic Auth gate as the only barrier. That is why it defaults to **OFF**, and why you should pair it with a `username` + `password`. The settings page warns about this next to the checkbox.

## Security notes

- **The LAN surface is OPEN by default** (empty username/password). Set **both** credentials in the settings page as soon as possible.
- Once password login is enabled, DSH's `/api` trust fence sees the rewritten loopback `Host`, so **privileged RPCs (settings/credentials) are reachable from the LAN** — the Basic Auth gate is the only barrier.
- **`skipLaunchToken` removes DSH's own token check** for the proxied surface: any device that can reach the proxy port is admitted without the launch token. Treat enabling it as equivalent to running the proxy with no DSH-side authentication, and always pair it with Basic Auth credentials.
- Browser-cached Basic credentials are NOT invalidated by a password change: the old credentials get a 401 and the dialog reappears; enter the new password. To fully clear them, remove the site's saved password in the browser.
