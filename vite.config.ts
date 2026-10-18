import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // In dev the API (and /mcp) runs on its own (npm run dev:server). In production it serves this
    // build. The Host header is passed through unchanged (Vite's shorthand would rewrite it to the
    // API's), because the API refuses requests whose Origin doesn't match it (server/security.ts).
    proxy: Object.fromEntries(
      ['/api', '/mcp', '/skills'].map((path) => [
        path,
        { target: 'http://localhost:3100', changeOrigin: false }
      ])
    )
  }
})
