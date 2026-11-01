import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development, requests to /api are forwarded to the Spring Boot backend so the
// browser never makes a cross-origin call (the backend has no CORS config yet).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': env.BACKEND_URL || 'http://localhost:8080',
      },
    },
  };
});
