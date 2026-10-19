import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // web/.env first, repo root .env as fallback (shared key across apps)
  const rootEnv = loadEnv(mode, '../', '');
  const webEnv = loadEnv(mode, '.', '');
  const mapsKey = webEnv.MAPS_API_KEY || rootEnv.MAPS_API_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.MAPS_API_KEY': JSON.stringify(mapsKey),
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
        '/socket.io': { target: 'http://localhost:3000', ws: true },
      },
    },
  };
});
