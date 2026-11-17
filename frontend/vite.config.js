import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // nécessaire pour charger dist/index.html via file:// dans Electron
  server: { port: 5173, strictPort: true },
})
