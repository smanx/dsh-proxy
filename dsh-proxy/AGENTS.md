# AGENTS.md

Standing orders for this repository. The product contract lives in [README.zh.md](README.zh.md) / [README.md](README.md); these rules govern how the repo is changed.

## Layout

- `src/` — TypeScript source. `src/proxy.ts` is the pure-node proxy core (native Basic Auth gate, HTTP + WebSocket forwarding, Host/Origin alignment, polyfill injection) with **no cordis dependency**; `src/controller.ts` is the proxy controller (effective options = cordis base + persisted overlay, start/stop/restart, status/update/start/stop verbs, persistence to `$DSH_HOME/dsh-proxy.json`); `src/index.ts` is the cordis plugin entry (Config schema, effect lifecycle, the `/dsh-proxy` Connection RPC channel); `src/session.ts` / `src/settings.ts` / `src/contract.ts` are pure, unit-tested helpers and the shared wire contract; `src/polyfill.ts` is the randomUUID shim; `src/client/` is the browser settings section (locales, styles, React component, plugin body). There is deliberately **no login page and no session cookie** — authentication is HTTP Basic Auth only (the browser's native dialog), matching the standalone dsh-proxy.
- `lib/` — committed build artifacts. `lib/index.cjs` is the fully self-contained host bundle the profile loads (schemastery, http-proxy, dsh-home-paths bundled inline; `@deepseek-ai/cordis` is type-only); `lib/client.js` is the browser bundle served at `/plugins/dsh-proxy/client.js` (only react is external). **Every source change that should be installable must rebuild and commit `lib/` in the same commit.**
- `tests/` — vitest suites at the repo root, importing internals by relative path (`../src/*.ts`; the section spec is jsdom).
- `scripts/smoke.mjs` — live smoke test against a running DSH (`pnpm run smoke`), including a plugin-contract phase that drives the bundled `apply()` with a fake ctx (redirecting `$DSH_HOME` to a temp dir so the real persisted config is never touched); not part of `pnpm run check`.

## Build and checks

- `pnpm run typecheck`, `pnpm run test`, `pnpm run build` — all three must be green before a commit claims completion; `pnpm run check` runs them in order.
- The bundle is CommonJS on purpose: http-proxy uses dynamic `require()` calls that esbuild cannot inline into ESM output. Keep `format: 'cjs'` and the `.cjs` extension.
- The cordis loader resolves the plugin by package name through the profile's node_modules and accepts the CJS shape (`unwrapExports`); the `dsh.bundle.patch` manifest key is what makes `dsh plugin add` register the bundle.

## Commit discipline

- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `build:`, `chore:`) with a body explaining what and why for non-trivial changes.
- One concern per commit: proxy behavior, auth, docs, build tooling, and test fixes land separately.
- Never commit credentials, `node_modules/`, or logs.

## Integration

- This plugin is named `dsh-proxy` (matching the repository) and its source lives at `dsh-lan-proxy/` inside the dsh-proxy repository (the DSH-plugin variant, alongside the standalone `go/` and `node/` builds). The repo ROOT carries a thin package manifest (name `dsh-proxy`) so the plugin installs from the repository itself: online `dsh plugin --profile <name> add github:smanx/dsh-proxy#master` (recommended) or local `dsh plugin --profile <name> add file:C:/mydata/codes/dsh-proxy` (bundle route); changes take effect on the **next `dsh web` restart**.
- Dev type sources are `file:`-linked to the dsh npm install's `node_modules` (`@deepseek-ai/cordis`, `@deepseek-ai/schemastery`, `@deepseek-ai/dsh-host-webserver`); when the harness version moves, re-run `pnpm install` and fix API drift.
- The upstream port defaults to `ctx.webServer.port` (the web app's real bound port) when `upstreamPort` is 0; the plugin injects `webServer` so that value is always available before `apply` runs.
- Listen failures (e.g. EADDRINUSE when the standalone dsh-proxy holds 3081) are logged loudly but must **never** fail the web app's boot.
