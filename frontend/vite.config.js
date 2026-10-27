import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/customers': { target: 'http://localhost:5001', changeOrigin: true },
      '/assets': { target: 'http://localhost:5001', changeOrigin: true },
      '/cart': { target: 'http://localhost:5001', changeOrigin: true },
      '/wishlist': { target: 'http://localhost:5001', changeOrigin: true },
      '/orders': { target: 'http://localhost:5001', changeOrigin: true },
      '/creator': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
});
