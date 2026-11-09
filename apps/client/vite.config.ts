import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 7430,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7420',
        changeOrigin: true,
      },
    },
  },
});
