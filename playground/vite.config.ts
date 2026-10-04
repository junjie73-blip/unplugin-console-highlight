import { defineConfig } from 'vite'
import { vitePlugin } from '../dist/index.mjs'

export default defineConfig({
  plugins: [
    vitePlugin({
      icon: '🐳',
      highlight: { theme: 'default' },
    }),
  ],
})
