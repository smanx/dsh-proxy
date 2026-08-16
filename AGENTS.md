# AGENTS.md

Standing orders for this repository. The product contract lives in [README.zh.md](README.zh.md) / [README.md](README.md); these rules govern how the repo is changed.

## Layout

- `src/` — TypeScript source. `src/proxy.ts` is the pure-node proxy core (auth gate, HTTP + WebSocket forwarding, Host/Origin alignment, polyfill injection) with **no cordis dependency**; `src/index.ts` is the cordis plugin entry (Config schema, effect lifecycle, startup logs); `src/session.ts` / `src/login.ts` / `src/polyfill.ts` are pure, unit-tested helpers.
- `lib/` — committed build artifacts. `lib/index.cjs` is the fully self-contained single file the profile loads (schemastery and http-proxy bundled inline; `@deepseek-ai/cordis` is type-only). **Every source change that should be installable must rebuild and commit `lib/` in the same commit.**
- `tests/` — vitest suites at the repo root, importing internals by relative path (`../src/*.ts`).
- `scripts/smoke.mjs` — live smoke test against a running DSH (`pnpm run smoke`); not part of `pnpm run check`.

## Build and checks

- `pnpm run typecheck`, `pnpm run test`, `pnpm run build` — all three must be green before a commit claims completion; `pnpm run check` runs them in order.
- The bundle is CommonJS on purpose: http-proxy uses dynamic `require()` calls that esbuild cannot inline into ESM output. Keep `format: 'cjs'` and the `.cjs` extension.
- The cordis loader resolves the plugin by package name through the profile's node_modules and accepts the CJS shape (`unwrapExports`); the `dsh.bundle.patch` manifest key is what makes `dsh plugin add` register the bundle.

## Commit discipline

- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `build:`, `chore:`) with a body explaining what and why for non-trivial changes.
- One concern per commit: proxy behavior, auth, docs, build tooling, and test fixes land separately.
- Never commit credentials, `node_modules/`, or logs.

## Integration

- Install into a dsh profile via `dsh plugin --profile <name> add file:/path/to/dsh-lan-proxy` (bundle route); changes take effect on the **next `dsh web` restart**.
- Dev type sources are `file:`-linked to the dsh npm install's `node_modules` (`@deepseek-ai/cordis`, `@deepseek-ai/schemastery`, `@deepseek-ai/dsh-host-webserver`); when the harness version moves, re-run `pnpm install` and fix API drift.
- The upstream port defaults to `ctx.webServer.port` (the web app's real bound port) when `upstreamPort` is 0; the plugin injects `webServer` so that value is always available before `apply` runs.
- Listen failures (e.g. EADDRINUSE when the standalone dsh-proxy holds 3081) are logged loudly but must **never** fail the web app's boot.
