// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    // HTTPS gerado pelo plugin basicSsl
    https: undefined,
    host: '0.0.0.0', // Permite acesso externo
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      // Em dev, o Vite precisa fazer proxy para as serverless functions.
      // Em produção, a Vercel cuida disso automaticamente.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});