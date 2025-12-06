import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import cloudflare from '@cloudflare/vite-plugin'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      getLoadContext: (request) => {
        return {
          env: {
            // Add bindings here
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-utils': ['html2pdf.js', 'jszip', 'file-saver'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})