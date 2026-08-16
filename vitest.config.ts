import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
