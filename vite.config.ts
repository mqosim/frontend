import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // The FastAPI backend sets the httpOnly refresh cookie as
      // `Secure; SameSite=None` (path /api/v1/identity; the SYSTEM realm keeps
      // its own cookie on /api/v1/system/auth). Serving the SPA and the API
      // from one origin via this proxy keeps those cookies first-party.
      //
      // No rewrite: the spec paths already include `/api/v1`, and the proxy must
      // not add or strip a prefix (a rewrite would hide a doubled-path bug).
      //
      // Always browse http://localhost:5173 (NOT http://127.0.0.1:5173):
      // `localhost` is a secure context in every browser, so `Secure` cookies are
      // stored over plain HTTP; `127.0.0.1` is not a secure context in Safari and
      // the cookies are dropped there.
      '/api': {
        // FastAPI dev server: uvicorn app.main:app --reload --port 8000.
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
})
