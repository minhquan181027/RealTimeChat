import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from '@tailwindcss/vite';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true, // Cho ph
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:1234', // Địa chỉ Backend của bạn
        changeOrigin: true,
        secure: false,
      },

    },
  },
})