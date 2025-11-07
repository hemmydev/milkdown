import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      '@milkdown/core',
      '@milkdown/ctx',
      '@milkdown/react',
      '@milkdown/preset-commonmark',
      '@milkdown/theme-nord',
      '@milkdown/plugin-history',
      '@milkdown/plugin-listener',
      '@milkdown/prose',
      '@milkdown/utils'
    ]
  }
})
