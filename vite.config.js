import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          maps: ['leaflet', 'maplibre-gl'],
          charts: ['recharts']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 24678
    }
  }
});
