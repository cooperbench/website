import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'static/chart',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: `chart-bundle.js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `chart-bundle.[ext]`
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
