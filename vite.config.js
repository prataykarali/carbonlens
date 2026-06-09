import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  preview: {
    allowedHosts: ['prataykarali-carbonlens.hf.space', '.hf.space'],
  },
  plugins: [react(), tailwindcss()],
})
