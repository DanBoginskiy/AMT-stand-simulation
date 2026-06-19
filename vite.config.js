import { defineConfig } from 'vite';

// Minimal Vite config. The app is a static single-page bundle — no backend.
export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
  },
});
