# unplugin-console-highlight

简体中文 | [English](./README.en.md)

> 让 `console` 输出自带**定位标签**与**语法着色**的跨构建工具插件。

每条日志前自动加上「图标 + 文件名·行号 ~ 函数名」色块标签，参数按类型着色，
并跟随系统的亮 / 暗偏好。浏览器 DevTools、终端、CI 日志三处都能直接读，
不需要修改任何现有调用写法。

```
┌──────────────────────────┐
│ 🚀 service.js·6 ~ list   │  用户列表  [{ name: "zy", role: "admin" }]
└──────────────────────────┘
   ↑ chip 色块（按文件取色）    ↑ 正文不加引号，字符串 / 数字 / 键名分别着色
```

三种输出环境自动选择可用样式：

| 环境 | 显示效果 |
| --- | --- |
| 🌐 浏览器 | 原始值着色；对象仍保持 DevTools 原生可展开、可点击 |
| 💻 终端（交互式） | 真彩色块与着色正文 |
| 📄 其他（CI、重定向到文件） | 纯文本标签 + 参数原文，不产生乱码 |

支持 **Vite / Rollup / webpack / Rspack / esbuild / Farm**。

- **定位准确**：不会打乱你的行号，`shebang`、`"use strict"` 脚本照常可用；
  在 DevTools 里点击调用点、打断点、读错误堆栈都落在原始源码位置。
- **写法宽容**：`console.log()`、`console?.log()`、`console.log?.()`、`console["log"]()`、
  `globalThis.console.log()` 都能正常加上标签。
- **手写样式共存**：你自己的 `%c` 样式串照常生效，正文里的 `%`（如 `100%`）不会被当成格式指令。
- **代码里可判断**：全局常量 `__CONSOLE_HIGHLIGHT__` 在插件启用时为 `true`
  （Vite 下全局可用，其他构建工具下在插件处理的文件内可用）。

## 安装

```bash
npm i -D unplugin-console-highlight
```

## 使用

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [vitePlugin()],
})
```

其他构建工具：

```ts
import { rollupPlugin, webpackPlugin, rspackPlugin, esbuildPlugin, farmPlugin } from 'unplugin-console-highlight'
```

不传任何配置就能得到「图标 + `文件名·行号 ~ 函数名`」的 chip 标签。

## 标签：prefix 与 suffix

```ts
vitePlugin({
  // 1) 模板字符串
  prefix: '{icon} {file}:{line} ~ {fn}',
  // 2) 片段数组（可逐片段控制颜色与粘合符）
  suffix: [
    { type: 'tag', glue: ' ' },        // [LOG]
    { type: 'time', glue: ' ' },       // 2026-10-04 23:31:55
  ],
  // 3) 函数形式（按调用点定制）
  prefix: ctx => `‹${ctx.method}› ${ctx.file}:${ctx.line}`,
})

vitePlugin({ prefix: false }) // 完全关闭标签
```

可用片段：`icon` `file` `path` `line` `function` `time` `tag` `method` `text`；
模板占位符：`{icon}` `{file}` `{path}` `{line}` `{fn}` `{time}` `{tag}` `{method}`。

片段的 `glue` 只在该片段成功渲染时输出，因此顶层作用域取不到函数名时不会出现悬空的 ` ~ `。

### 标签样式

```ts
vitePlugin({
  label: {
    mode: 'chip',        // 'chip' 色块背景（默认）| 'text' 仅前景色
    color: 'auto',       // 'auto' 按文件名取色，或指定 '#2563eb'
    palette: { light: ['#2563eb', '#059669'], dark: ['#60a5fa', '#34d399'] },
    textColor: 'auto',   // 'auto' 按背景亮度自动选黑 / 白
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;',
  },
})
```

## 值着色与亮暗模式

```ts
vitePlugin({
  highlight: {
    env: 'auto',         // 'auto' | 'browser' | 'terminal' | 'plain'
    mode: 'auto',        // 'auto' | 'light' | 'dark'
    maxDepth: 4,         // 对象展开深度
    maxEntries: 50,      // 数组 / Map / Set / 对象条目上限
    maxStringLength: 500,
    tokens: {            // 按模式覆盖配色
      light: { message: '#1f2328', string: '#a31515', key: '#0451a5' },
      dark: { message: '#e6edf3', string: '#ce9178', key: '#9cdcfe' },
    },
  },
})

vitePlugin({ highlight: false }) // 只保留标签，参数原样输出
```

- 亮色配色参考 VSCode Light+，暗色参考 VSCode Dark+
- 浏览器 `mode: 'auto'` 跟随系统主题，切换即时生效；终端 `auto` 默认暗色
- `message` 只作用于**首个字符串参数**：按日志正文显示，不加引号；
  其后的字符串参数才带引号按 `string` 着色

可用配色类别：`message` `string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`。

## 全部配置项

| 配置 | 类型 | 默认值 |
| --- | --- | --- |
| `include` | `FilterPattern` | `[/\.(js\|ts\|jsx\|tsx\|vue)$/]`（叠加语义） |
| `exclude` | `FilterPattern` | `[/node_modules/]`（叠加语义） |
| `methods` | `ConsoleMethod[]` | `['log','info','warn','error','debug']` |
| `icon` | `string \| Record<method,string> \| false` | 按方法 📝 ℹ️ ⚠️ ❌ 🔍 |
| `prefix` | `LabelInput` | 图标 + `文件·行号 ~ 函数` |
| `suffix` | `LabelInput` | `false` |
| `label` | `LabelStyleOptions` | chip / auto 取色 / auto 文字色 |
| `timeFormat` | `string \| false` | `'YYYY-MM-DD HH:mm:ss'` |
| `highlight` | `boolean \| HighlightOptions` | `true` |
| `root` | `string` | Vite 取项目根，其余取当前工作目录 |

`timeFormat` 支持 `YYYY` `YY` `MM` `DD` `HH` `mm` `ss` `SSS`。

### 类型辅助

```ts
import { defineConsoleHighlightConfig, defineLabel } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🦄',
  prefix: defineLabel([{ type: 'icon' }, { type: 'file', glue: ' ' }]),
  highlight: { mode: 'dark', maxDepth: 3 },
})
```

### 独立配置文件

项目根目录放置 `console-highlight.config.{ts,mts,mjs,js,cjs,json}`（TS / ESM 需要额外依赖 `jiti`），
或在 `package.json` 声明 `consoleHighlight` 字段。

优先级：**插件参数 → 配置文件 → package.json 字段 → 内置默认值**（`include` / `exclude` 为叠加）。
Vite 开发服务下修改配置会自动重载，配置等价时不重载。

## 示例

仓库内 `examples/vanilla`、`examples/vue`、`examples/react` 是可直接运行的示例：

```bash
pnpm install
pnpm build         # 先构建插件
pnpm dev:vanilla   # 纯 JavaScript + Vite
pnpm dev:vue       # Vue 3
pnpm dev:react     # React 19
```

## 文档

- 文档站：指南、配置项参考、API、示例与常见问题
- 中文：`docs/docs/`　英文：`docs/docs/en/`
- 本地预览：`pnpm docs:dev`

## 从 v1 迁移

v2 移除了 `timeSeparator` / `styles` / `theme` / `showFileName` / `showLineNumber` / `silentProduction`
等配置，改由 `prefix` / `suffix` 片段与 `label` / `highlight.mode` 承担。详见文档站《迁移指南》。

## License

MIT
