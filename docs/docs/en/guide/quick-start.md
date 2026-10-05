# Quick Start

## 1. Register the plugin

```ts [vite.config.ts]
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [
    vitePlugin({
      // 配置项均可选，这里只演示最常用的两个；不传也能直接用
      icon: '🚀',
      highlight: { mode: 'auto' },
    }),
  ],
})
```

## 2. Call console as usual

```ts [src/log.ts]
export function logMessage() {
  console.log('Hello TypeScript')
}
```

## 3. See the result

Start the dev server and open the DevTools console:

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 log.ts·4 ~ logMessage</span> <span style="color:#1f2328">Hello TypeScript</span>

- The chip shows icon + filename·line ~ function name (at the top level, `~ 函数名` is left off automatically).
- The chip color is chosen from the filename and stays stable for the same file.
- `Hello TypeScript` is the log message, so it has no quotes. Only the string arguments after it get quotes and string coloring.

## 4. Check the terminal

In a Node script or SSR setup, the same code prints a colored label in the terminal:

```bash
node dist/server.js
# 🚀 log.ts·4 ~ logMessage Hello TypeScript（终端里是真彩色色块与着色正文）
```

## Next steps

- [Prefix & suffix labels](/en/guide/labels): customize label content, color, and position
- [Value highlighting & light & dark modes](/en/guide/highlight): control object expansion, truncation, and colors
- [Options reference](/en/config/options): all options at a glance
