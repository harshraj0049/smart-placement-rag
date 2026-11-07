import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Requests to /api are proxied to the FastAPI backend (VITE_API_URL, default http://localhost:8000).
// If the backend serves its routes without an /api prefix (for example POST /documents), set
// VITE_PROXY_STRIP_API=true so /api/documents reaches the server as /documents.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_URL || 'http://localhost:8000'
  const strip = env.VITE_PROXY_STRIP_API === 'true'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target, changeOrigin: true, ...(strip ? { rewrite: (p) => p.replace(/^\/api/, '') } : {}) } },
    },
  }
})
