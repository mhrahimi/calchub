import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests.ts', '**/*.tests.ts', '**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
