/**
 * Single-file CJS host build + single-file browser client build for
 * dsh-proxy.
 *
 * Host (`lib/index.cjs`): fully self-contained — schemastery, http-proxy (a
 * CJS tree with dynamic requires, which esbuild cannot inline into ESM), and
 * dsh-home-paths are bundled into one CommonJS file; @deepseek-ai/cordis is
 * type-only (erased). The profile needs no extra runtime dependencies — the
 * loader's dynamic import() + unwrapExports handles the CJS shape natively.
 *
 * Client (`lib/client.js`): one CJS bundle wrapped in the ModuleLoader
 * factory handshake (served by the web app at /plugins/dsh-proxy/client.js).
 * Every @deepseek-ai/* import is type-only and erased; react stays external
 * (the app's module system provides it).
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  logLevel: 'info',
})

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [...dshExternal, 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
  banner: {
    js: "window.__ModuleLoader__.load({ id: '@smanx/dsh-proxy', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

// Emit the .d.ts tree next to the bundles (declaration-only). The tsc bin shim
// is a shell script on Windows, so run the JS entry under the current node.
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  { stdio: 'inherit' },
)
