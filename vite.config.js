import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the Vite server (5173) proxies API + uploads to Express (3001).
// In prod, Express serves the built /dist directory.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
