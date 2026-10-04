# unplugin-console-highlight

> 让 `console` 输出自带**定位标签**与**语法高亮**的跨构建工具插件。

构建期扫描并改写 `console.*` 调用，注入零依赖运行时：每条日志前后可插入 chip 色块标签（图标 / 文件名 / 行号 / 函数名 / 时间 / 方法标签），日志参数按 token 着色，并自动适配亮色与暗色环境。

```
┌──────────────────────────┐
│ 🚀 service.js·6 ~ list   │  "用户列表"  [{ name: "zy", role: "admin" }]
└──────────────────────────┘
   ↑ chip 色块（按文件哈希取色）      ↑ 字符串 / 数字 / 键名分别着色
```

三种输出环境自动降级：

| 环境 | 渲染方式 |
| --- | --- |
| 🌐 浏览器 | `%c` CSS 着色原始值；对象走 `%o`，devtools 中仍可展开、可交互 |
| 💻 终端（TTY） | 24-bit ANSI 前景 / 背景色 |
| 📄 其他（CI、管道） | 纯文本标签 + 参数原样透传，不产生乱码 |

基于 [unplugin](https://github.com/unjs/unplugin)，支持 **Vite / Rollup / webpack / Rspack / esbuild / Farm**；产物由 [Rolldown](https://rolldown.rs) 打包。

## 仓库结构

pnpm workspace monorepo：

```
packages/core        插件本体（unplugin-console-highlight）
examples/vanilla     纯 JavaScript + Vite 示例
examples/vue         Vue 3 + TypeScript 示例
examples/react       React 19 + JSX 示例
docs                 Rspress 文档站
```

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

默认配置即可得到「图标 + `文件名·行号 ~ 函数名`」的 chip 标签。

## 标签：prefix 与 suffix

`prefix` / `suffix` 支持三种写法：

```ts
vitePlugin({
  // 1) 模板字符串
  prefix: '{icon} {file}:{line} ~ {fn}',
  // 2) 片段数组（可逐片段控制颜色与粘合符）
  suffix: [
    { type: 'tag', glue: ' ' },        // [LOG]
    { type: 'time', glue: ' ' },       // 2026-10-04 23:31:55
  ],
  // 3) 函数形式（构建期按调用点求值，运行期零开销）
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
    color: 'auto',       // 'auto' 按文件名哈希取色，或指定 '#0969da'
    palette: { light: ['#1890ff', '#52c41a'], dark: ['#1668dc', '#49aa19'] },
    textColor: 'auto',   // 'auto' 按背景亮度自动选黑 / 白
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;',
  },
})
```

## 值高亮与亮暗模式

```ts
vitePlugin({
  highlight: {
    env: 'auto',         // 'auto' | 'browser' | 'terminal' | 'plain'
    mode: 'auto',        // 'auto' | 'light' | 'dark'
    maxDepth: 4,         // 对象展开深度
    maxEntries: 50,      // 数组 / Map / Set / 对象条目上限
    maxStringLength: 500,
    tokens: {            // 按模式覆盖 token 颜色
      light: { string: '#a31515', key: '#0451a5' },
      dark: { string: '#ce9178', key: '#9cdcfe' },
    },
  },
})

vitePlugin({ highlight: false }) // 只保留标签，参数原样透传
```

- 亮色 token 参考 VSCode Light+，暗色参考 VSCode Dark+
- 浏览器 `mode: 'auto'` 跟随 `prefers-color-scheme`，切换系统主题即时生效
- 终端 `mode: 'auto'` 默认暗色

token 类别：`string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`。

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
| `root` | `string` | Vite 取 `config.root`，其余 `process.cwd()` |

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

项目根目录放置 `console-highlight.config.{ts,mts,mjs,js,cjs,json}`（TS / ESM 需要可选依赖 `jiti`），或在 `package.json` 声明 `consoleHighlight` 字段。

优先级：**插件参数 → 配置文件 → package.json 字段 → 内置默认值**（`include` / `exclude` 为叠加）。Vite dev 下修改配置自动重启，配置等价时不重启。

### 编程式使用运行时

运行时零依赖，可单独引入：

```ts
import { createHighlight, detectEnv, detectMode, serializeToSegments } from 'unplugin-console-highlight'
```

## 本地开发

```bash
pnpm install

pnpm build         # 核心包：tsc 声明 + rolldown 打包
pnpm test          # vitest（先构建，97 用例）
pnpm typecheck     # tsc --noEmit

pnpm dev:vanilla   # 纯 JS 示例
pnpm dev:vue       # Vue 3 示例
pnpm dev:react     # React 19 示例

pnpm docs:dev      # 文档站
pnpm docs:build
```

## 从 v1 迁移

v2 是破坏性重构，`timeSeparator` / `styles` / `theme` / `showFilename` / `showLineNumber` / `silentProduction` 等配置已移除，改由 `prefix` / `suffix` 片段与 `label` / `highlight.mode` 承担。详见文档站《迁移指南》。

## License

ISC
