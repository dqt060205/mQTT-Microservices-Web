import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In dev, /api/* is forwarded to the API Gateway (no CORS setup needed)
      proxy: { '/api': env.VITE_GATEWAY_URL || 'http://localhost:8080' },
    },
  };
});
