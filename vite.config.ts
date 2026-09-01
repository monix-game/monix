import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      // Proxy WebSocket connections to the local backend during development
      '/ws': {
        target: 'ws://localhost:6200',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000, // Increase chunk size warning limit to 2MB
  },
});
