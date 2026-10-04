import vue from '@vitejs/plugin-vue'
import { vitePlugin } from 'unplugin-console-highlight'

export default {
  plugins: [
    vue(),
    vitePlugin({
      icon: {
        log: '🧩',
        info: '💡',
        warn: '⚠️',
        error: '🔥',
        debug: '🐞',
      },
      label: {
        mode: 'chip',
        palette: {
          light: ['#1890ff', '#52c41a', '#faad14', '#eb2f96'],
          dark: ['#1668dc', '#49aa19', '#d89614', '#c41d7f'],
        },
      },
    }),
  ],
}
