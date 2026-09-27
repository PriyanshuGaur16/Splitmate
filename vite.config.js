import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Fixed port so localStorage (scoped per-origin, port included) stays
  // consistent across runs instead of silently drifting to a new port.
  server: {
    port: 5173,
    strictPort: true,
  },
})
