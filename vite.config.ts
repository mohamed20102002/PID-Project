import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { storagePlugin } from './vite-plugin-storage'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), storagePlugin()],
})
