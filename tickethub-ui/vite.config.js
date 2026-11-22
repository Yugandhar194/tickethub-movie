import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Spring and .NET backends only allow http://localhost:5173 in their CORS config,
// so the dev server is pinned to that port.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
