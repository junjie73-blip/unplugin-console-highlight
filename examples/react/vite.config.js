import react from '@vitejs/plugin-react'
import { vitePlugin } from 'unplugin-console-highlight'

export default {
  plugins: [
    react(),
    vitePlugin({
      prefix: [
        { type: 'icon' },
        { type: 'file', glue: ' ' },
        { type: 'line', glue: '·' },
        { type: 'function', glue: ' ~ ' },
      ],
      suffix: ctx => `‹${ctx.method}›`,
      label: { mode: 'chip', textColor: 'auto' },
    }),
  ],
}
