# 快速开始

## 1. 注册插件

```ts [vite.config.ts]
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [
    vitePlugin({
      // 所有配置项均可选，以下为默认值的显式写法
      icon: '🚀',
      highlight: { mode: 'auto' },
    }),
  ],
})
```

## 2. 正常书写 console

```ts [src/log.ts]
export function logMessage() {
  console.log('Hello TypeScript')
}
```

## 3. 查看效果

启动 dev server 后打开 DevTools 控制台：

<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 log.ts·4 ~ logMessage</span> <span style="color:#a31515">"Hello TypeScript"</span>

- 色块内容 = 图标 + 文件名·行号 ~ 函数名（顶层作用域自动省略 `~ 函数名`）
- 色块颜色按文件名哈希自动选取，同一文件颜色稳定
- 字符串 `"Hello TypeScript"` 按亮 / 暗模式 token 着色

## 4. 终端验证

在 Node 脚本或 SSR 场景中，同一份产物输出 ANSI 色块：

```bash
node dist/server.js
# 🚀 log.ts·4 ~ logMessage "Hello TypeScript"（带 24-bit ANSI 背景与前景色）
```

## 下一步

- [前缀与后缀标签](/guide/labels)：自定义标签内容、颜色与位置
- [值高亮与亮暗模式](/guide/highlight)：控制对象展开、截断与配色
- [配置项参考](/config/options)：全部配置项一览
