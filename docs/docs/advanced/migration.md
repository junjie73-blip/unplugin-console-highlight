# 迁移指南

v2 更换了包名、导入方式与配置模型。本文覆盖从 `vite-plugin-pconsole` / 早期 `console-highlight`
（v0.x – v1.x）升级到 v2 的所有变更点。

## 变更总览

| 项目 | v1 | v2 |
| --- | --- | --- |
| 包名 | `vite-plugin-pconsole` | `unplugin-console-highlight` |
| 构建工具支持 | 仅 Vite | Vite / Rollup / webpack / Rspack / esbuild / Farm |
| 导入 | `fancyPlugin` | `vitePlugin` `rollupPlugin` `webpackPlugin` `rspackPlugin` `esbuildPlugin` `farmPlugin` |
| 标签模型 | 固定「时间 + 文件名:行号」拼接 | `prefix` / `suffix` 片段数组或模板字符串 |
| 视觉 | 渐变文字 + 阴影（`styles`） | chip 色块 / 纯文字，按文件取色 |
| 值显示 | 原样输出 | 按类型着色（浏览器 / 终端 / 纯文本一致） |
| 主题 | `theme: 'default' \| 'dark' \| ThemePreset` | `highlight.mode` + `highlight.tokens`（按模式覆盖） |
| 时间 | 依赖 `dayjs` | 内置格式化，无需额外依赖 |
| 配置文件 | `fancy.config.*` | `console-highlight.config.*` |

## 1. 安装与导入

```bash
pnpm remove vite-plugin-pconsole
pnpm add -D unplugin-console-highlight
```

```diff
- import { fancyPlugin } from 'vite-plugin-pconsole'
+ import { vitePlugin } from 'unplugin-console-highlight'

  export default defineConfig({
-   plugins: [fancyPlugin({ icon: '🐳' })],
+   plugins: [vitePlugin({ icon: '🐳' })],
  })
```

其他构建工具：

```js
import { webpackPlugin } from 'unplugin-console-highlight'
// webpack.config.js
plugins: [webpackPlugin({ icon: '🐳' })]
```

## 2. 被移除的配置项

| v1 配置 | v2 替代 |
| --- | --- |
| `showFileName` / `showLineNumber` | `prefix` 片段中是否包含 `{ type: 'file' }` / `{ type: 'line' }` |
| `fileLineSeparator` | 文件名与行号片段的 `glue`（默认 `·`） |
| `timeSeparator` | 时间片段的 `glue` |
| `styles` | `label`（色板 / 前景色 / 附加 CSS）+ `highlight.tokens` |
| `silentProduction` | 按命令启用插件，或 `highlight: false` |
| `theme: 'default' \| 'dark'` | `highlight: { mode: 'light' \| 'dark' \| 'auto' }` |
| `theme: ThemePreset`（colors / cssVariables） | `highlight.tokens` + `label.palette` |
| `prefix: (type) => string` | `prefix: (ctx) => string \| LabelSegment[]` |

:::warning
v1 的 `prefix` 函数在输出时执行，只能拿到方法名；v2 的函数形式按调用点定制，
上下文是 `{ method, file, line, fn }`，结果在打包时就已确定。
因此不要在函数里读取运行时才有的状态（例如实时时间请用 `time` 片段）。
:::

## 3. 标签写法迁移

v1 的典型配置：

```js
fancyPlugin({
  icon: '🐳',
  timeFormat: 'HH:mm:ss',
  timeSeparator: ' - ',
  showFileName: true,
  showLineNumber: true,
  fileLineSeparator: ':',
  styles: { log: '#2563eb', error: '#e11d48' },
})
```

v2 等价写法（模板字符串形式）：

```js
vitePlugin({
  icon: '🐳',
  timeFormat: 'HH:mm:ss',
  prefix: '{icon} {time} - {file}:{line} ~ {fn}',
  label: { mode: 'text' }, // 不要色块时
})
```

或片段数组形式（可精细控制每个片段的颜色与粘合符）：

```js
vitePlugin({
  icon: '🐳',
  timeFormat: 'HH:mm:ss',
  prefix: [
    { type: 'icon' },
    { type: 'time', glue: ' ' },
    { type: 'file', glue: ' - ' },
    { type: 'line', glue: ':' },
    { type: 'function', glue: ' ~ ' },
  ],
})
```

v1 的「按方法着色」在 v2 中由方法标签色与色板承担：

```js
vitePlugin({
  // 方法标签色（[LOG] / [ERROR] 等）
  highlight: { tokens: { light: { tags: { log: '#2563eb', error: '#e11d48' } } } },
  // chip 色块色板
  label: { palette: ['#2563eb', '#059669', '#d97706', '#e11d48'] },
})
```

## 4. 主题迁移

```diff
- theme: 'dark'
+ highlight: { mode: 'dark' }

- theme: {
-   colors: { log: { icon: '📝', gradient: 'linear-gradient(...)' } },
-   cssVariables: { '--fancy-radius': '4px' },
- }
+ label: { mode: 'chip', css: 'border-radius:4px;padding:2px 6px;' },
+ highlight: { tokens: { dark: { string: '#ce9178', key: '#9cdcfe' } } },
```

v2 不再提供渐变文字与阴影：它们在终端和纯文本环境无法呈现，
导致同一条日志在三种地方长得完全不一样。chip 色块在浏览器、终端、纯文本下都能一致表达。

导入项变更：

```diff
- import { THEME_PRESETS, resolveThemeTokens, defineHighlightTheme } from 'vite-plugin-pconsole'
+ import { TOKEN_PRESETS, resolveTokens, LIGHT_PALETTE, DARK_PALETTE } from 'unplugin-console-highlight'
```

## 5. 配置文件迁移

```bash
mv fancy.config.ts console-highlight.config.ts
```

```diff
- import type { FancyOptions } from 'vite-plugin-pconsole'
- const config: FancyOptions = {
+ import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'
+
+ export default defineConsoleHighlightConfig({
    icon: '🐳',
-   showFileName: true,
- }
- export default config
+   prefix: '{icon} {file}:{line}',
+ })
```

候选文件名（按顺序查找，命中即停止）：

```
console-highlight.config.ts / .mts / .mjs / .js / .cjs / .json
```

`package.json` 字段名仍为 `consoleHighlight`。读取 `.ts` / `.mjs` 配置需要额外依赖 `jiti`：

```bash
pnpm add -D jiti
```

v1 会把 `package.json` 也当成配置文件轮询，v2 改为「独立配置文件优先，未命中才回退 `package.json`」。

## 6. 新增能力

迁移完成后可选地启用：

```js
vitePlugin({
  // 后缀标签（v1 无此能力）
  suffix: [{ type: 'tag', glue: ' ' }, { type: 'time', glue: ' ' }],
  // 值语法着色（v1 为原样输出）
  highlight: {
    mode: 'auto',   // 亮 / 暗模式，浏览器跟随系统偏好
    maxDepth: 4,
    maxEntries: 50,
  },
  // 只处理部分方法
  methods: ['log', 'warn', 'error'],
})
```

## 7. 检查清单

- [ ] 卸载旧包，安装 `unplugin-console-highlight`
- [ ] 导入从 `fancyPlugin` 改为 `vitePlugin`（或其他构建工具工厂）
- [ ] 删除 `showFileName` / `showLineNumber` / `timeSeparator` / `fileLineSeparator` / `styles` / `silentProduction`
- [ ] `theme` 改为 `highlight.mode` + `highlight.tokens`
- [ ] 旧 `prefix` 函数改为返回模板字符串或片段数组
- [ ] 配置文件重命名为 `console-highlight.config.*`，类型改用 `defineConsoleHighlightConfig`
- [ ] TS 项目补充 `declare const __CONSOLE_HIGHLIGHT__: boolean`（若使用了该常量）
- [ ] 启动开发服务，确认控制台出现色块标签、正文着色正常
