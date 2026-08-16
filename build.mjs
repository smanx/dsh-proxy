/**
 * Single-file CJS host build for dsh-lan-proxy.
 *
 * The result is fully self-contained: schemastery and http-proxy (a CJS
 * dependency tree with dynamic requires, which esbuild cannot inline into an
 * ESM bundle) are bundled into one CommonJS file, and @deepseek-ai/cordis is
 * imported type-only (erased at build). The profile therefore needs no extra
 * runtime dependencies — the loader's dynamic import() + unwrapExports
 * handles the CJS shape natively.
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

// Emit the .d.ts tree next to the bundle (declaration-only). The tsc bin shim
// is a shell script on Windows, so run the JS entry under the current node.
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  { stdio: 'inherit' },
)
