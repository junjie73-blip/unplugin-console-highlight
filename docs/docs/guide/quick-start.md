# 快速开始

## 1. 注册插件

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

## 2. 正常书写 console

```ts [src/log.ts]
export function logMessage() {
  console.log('Hello TypeScript')
}
```

## 3. 查看效果

启动 dev server 后打开 DevTools 控制台：

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 log.ts·4 ~ logMessage</span> <span style="color:#1f2328">Hello TypeScript</span>

- 色块内容 = 图标 + 文件名·行号 ~ 函数名（顶层作用域自动省略 `~ 函数名`）
- 色块颜色按文件名自动选取，同一文件颜色稳定
- `Hello TypeScript` 作为日志正文显示，不加引号；其后的字符串参数才带引号按字符串着色

## 4. 终端验证

在 Node 脚本或 SSR 场景中，同一份代码会在终端里输出彩色标签：

```bash
node dist/server.js
# 🚀 log.ts·4 ~ logMessage Hello TypeScript（终端里是真彩色色块与着色正文）
```

## 下一步

- [前缀与后缀标签](/guide/labels)：自定义标签内容、颜色与位置
- [值高亮与亮暗模式](/guide/highlight)：控制对象展开、截断与配色
- [配置项参考](/config/options)：全部配置项一览
