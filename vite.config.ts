import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy /api to the local backend during development
      '/api': {
        target: 'http://localhost:6200',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
