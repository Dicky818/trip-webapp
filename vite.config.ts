import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/trip-webapp/',
  build: {
    // Target Safari 14+ and modern browsers for compatibility
    target: ['es2020', 'safari14', 'chrome87', 'firefox78'],
  },
})
