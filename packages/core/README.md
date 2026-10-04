# unplugin-console-highlight

构建期改写 `console.*` 调用，为每条日志注入**定位标签**（chip 色块 / 纯文字）与**运行时值语法高亮**，自动适配浏览器、终端与纯文本三种环境，并支持亮色 / 暗色模式。

基于 [unplugin](https://github.com/unjs/unplugin)：Vite / Rollup / webpack / Rspack / esbuild / Farm 通用。

```
┌──────────────────────────┐
│ 🚀 service.js·6 ~ list   │  "用户列表"  [{ name: "zy", role: "admin" }]
└──────────────────────────┘
```

## 安装

```bash
npm i -D unplugin-console-highlight
```

## 快速开始

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [vitePlugin()],
})
```

```js
// webpack.config.js
const { webpackPlugin } = require('unplugin-console-highlight')
module.exports = { plugins: [webpackPlugin()] }
```

## 常用配置

```ts
vitePlugin({
  icon: '🚀',
  // 模板字符串 / 片段数组 / 构建期函数，三选一
  prefix: '{icon} {file}·{line} ~ {fn}',
  suffix: [{ type: 'tag', glue: ' ' }, { type: 'time', glue: ' ' }],
  label: {
    mode: 'chip',            // 'chip' | 'text'
    color: 'auto',           // 按文件名哈希取色
    textColor: 'auto',       // 按背景亮度选黑 / 白
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;',
  },
  timeFormat: 'YYYY-MM-DD HH:mm:ss',
  highlight: {
    env: 'auto',             // 'auto' | 'browser' | 'terminal' | 'plain'
    mode: 'auto',            // 'auto' | 'light' | 'dark'
    maxDepth: 4,
    maxEntries: 50,
    maxStringLength: 500,
  },
})
```

`prefix: false` 关闭标签，`highlight: false` 只保留标签、参数原样透传。

标签片段：`icon` `file` `path` `line` `function` `time` `tag` `method` `text`。

## 独立配置文件

`console-highlight.config.{ts,mts,mjs,js,cjs,json}` 或 `package.json` 的 `consoleHighlight` 字段。
TS / ESM 格式需要可选依赖 `jiti`。Vite dev 下修改配置自动重启。

```ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🦄',
  highlight: { mode: 'dark' },
})
```

## 运行时单独使用

```ts
import { createHighlight, detectEnv, detectMode, serializeToSegments } from 'unplugin-console-highlight/runtime'
```

## 导出

| 导出 | 说明 |
| --- | --- |
| `default` | unplugin 工厂（`.vite` / `.rollup` / `.webpack` / `.rspack` / `.esbuild` / `.farm`） |
| `vitePlugin` `rollupPlugin` `webpackPlugin` `rspackPlugin` `esbuildPlugin` `farmPlugin` | 各框架插件 |
| `defineConsoleHighlightConfig` `defineLabel` | 类型辅助 |
| `DEFAULT_CONFIG` `DEFAULT_ICONS` `DEFAULT_PREFIX` `DEFAULT_LABEL` `TOKEN_PRESETS` `LIGHT_PALETTE` `DARK_PALETTE` `resolveTokens` | 默认值与预设 |
| `createHighlight` `detectEnv` `detectMode` `formatTime` `serializeToSegments` `contrastText` `hashString` `hexToAnsi` `hexToAnsiBackground` | 运行时 |
| `transformCode` `VIRTUAL_MODULE_ID` `getLineNumber` | 构建期工具 |
| `loadConfig` `CONFIG_FILE_NAMES` `PACKAGE_CONFIG_FIELD` | 配置加载 |
| `mergeConfig` `toRuntimeOptions` `shouldTransform` `deepEqual` | 内部工具 |

完整配置项、示例与迁移说明见仓库文档站（`docs/`）。

## License

ISC
