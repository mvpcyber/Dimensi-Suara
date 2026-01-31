
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Naikkan batas peringatan menjadi 2MB agar terminal lebih bersih
    chunkSizeWarningLimit: 2000, 
    rollupOptions: {
        output: {
            // Memisahkan library besar (React, Lucide, dll) ke file terpisah (vendor.js)
            // agar browser bisa melakukan cache dengan lebih baik
            manualChunks: {
                vendor: ['react', 'react-dom'],
                ui: ['lucide-react'],
                ai: ['@google/genai']
            }
        }
    }
  },
  server: {
    port: 3000,
  }
});
