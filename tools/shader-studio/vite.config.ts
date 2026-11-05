import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { ruecaNotes } from './rueca/notes-server/vite.ts'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), ruecaNotes()],
  resolve: {
    alias: { '@kit': src('./src/components/studio'), '@': src('./src') },
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5280 },
})
