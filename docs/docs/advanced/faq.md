# 常见问题

## 一般

### 生产环境会有影响吗？

运行时代码只在被转换的模块中通过虚拟模块引入。若生产构建不希望携带，
最简单的做法是按命令启用插件：

```js
export default defineConfig(({ command }) => ({
  plugins: [command === 'serve' && vitePlugin()],
}))
```

即便保留，运行时会先探测环境：非 TTY 的 Node 输出（CI、日志文件）走 `plain` 分支，
只输出纯文本标签 + 原样参数，不会产生 ANSI 乱码。

### 支持哪些构建工具？

基于 [unplugin](https://github.com/unjs/unplugin)，导出 Vite / Rollup / webpack / Rspack / esbuild / Farm 六套插件工厂：

```js
import { vitePlugin, rollupPlugin, webpackPlugin, rspackPlugin, esbuildPlugin, farmPlugin } from 'unplugin-console-highlight'
```

### 支持哪些语言与框架？

默认转换 `/\.(js|ts|jsx|tsx|vue)$/`，可通过 `include` 扩展（例如 Svelte、Astro）。
Vue SFC 的 `<script>` 块在 Vite 中以 `.vue?id=...` 形式进入 transform，插件会自动剥离 query 后匹配。

### 和 unplugin-turbo-console 能同时用吗？

不建议。两者都会改写 `console` 调用，叠加后会出现双重前缀、参数错位。
本插件的 `prefix` / `suffix` 标签片段（`file` `line` `function` `time` `tag`）已覆盖
turbo-console 的定位能力，额外提供了值语法高亮与亮暗模式，可直接替换。

## 标签

### 日志前没有出现标签？

依次检查：

1. 文件是否命中 `include`（默认只处理 js/ts/jsx/tsx/vue，`.svelte`、`.astro` 需自行添加）
2. 方法是否在 `methods` 中（默认 `log` `info` `warn` `error` `debug`）
3. 插件是否被放在其他改写 `console` 的插件**之后**
4. 构建产物中能否搜到 `virtual:console-highlight/runtime`

### `{fn}` 为什么是空的？

函数名来自构建期的作用域扫描。以下情况取不到，标签会自动省略该片段（连同其 `glue`）：

- 调用位于模块顶层（不在任何函数内）
- 经过压缩 / 混淆后函数名已丢失
- 极少数复杂写法（如 IIFE 内部的匿名回调链）

省略是有意设计：避免出现 `log.ts·4 ~ ` 这样带悬空分隔符的标签。

### 如何只显示图标？

```js
vitePlugin({ prefix: [{ type: 'icon' }] })
```

或保留默认片段、仅换图标：

```js
vitePlugin({ icon: '🚀' })                    // 全部方法共用
vitePlugin({ icon: { error: '💥', warn: '⚠️' } }) // 按方法定制
vitePlugin({ icon: false })                    // 关闭图标片段
```

### chip 色块颜色是怎么定的？

`label.color: 'auto'`（默认）时，按**文件名哈希**从 `label.palette` 取色，
因此同一文件的所有日志颜色一致、不同文件互相区分。
想要单色标签就指定固定十六进制值：`label: { color: '#0969da' }`。

### 如何关闭时间显示？

时间只在标签里出现 `{time}` / `{ type: 'time' }` 片段时才渲染。默认前缀不含时间，
若你添加了该片段又想去掉，删除片段即可；或全局关闭格式化：

```js
vitePlugin({ timeFormat: false })
```

`timeFormat` 支持占位符：`YYYY` `YY` `MM` `DD` `HH` `mm` `ss` `SSS`。

## 高亮

### 浏览器里对象为什么还是原样展示？

这是刻意的。浏览器环境只对**原始值**（字符串 / 数字 / 布尔 / null 等）着色，
对象与数组走 `%o` 交给 devtools 原生渲染，保留展开、搜索、引用跳转能力。
若希望对象也被序列化成彩色文本，可在终端环境查看，或显式指定：

```js
vitePlugin({ highlight: { env: 'terminal' } })
```

### 终端里没有颜色？

终端着色要求 TTY 与 24-bit 真彩支持：

- `process.stdout.isTTY` 为 false（重定向到文件、CI 日志）时自动降级为 `plain`
- Windows 老版本 cmd 不支持真彩，建议使用 Windows Terminal / PowerShell 7+
- 部分终端模拟器需开启 truecolor（如 tmux 需要 `set -ga terminal-overrides ",*:Tc"`）

### 输出里出现 `[Circular]` 或 `…` 是什么意思？

- `[Circular]`：检测到循环引用，停止展开该分支
- `…`：达到 `maxDepth`（默认 4）后不再深入
- `+N`：数组 / 对象 / Map / Set 条目超过 `maxEntries`（默认 50）后的省略计数
- `abc…`：字符串超过 `maxStringLength`（默认 500）被截断

这些都是保护性限制，可通过 `highlight` 配置调整。

### 如何完全关闭高亮、只保留标签？

```js
vitePlugin({ highlight: false })
```

此时运行时只输出标签，`console` 参数原样透传，devtools 的 `%o`、堆栈定位等原生行为不受影响。

### 亮暗模式什么时候会切换？

`highlight.mode: 'auto'` 时：

- 浏览器：每次输出读取 `matchMedia('(prefers-color-scheme: dark)')`，系统主题切换后立即生效，无需刷新
- 终端：默认按暗色渲染（多数终端为深色背景），需要亮色请显式 `mode: 'light'`

## 配置

### 报错 `加载 console-highlight.config.ts 需要安装 jiti`？

`.ts` / `.mts` / `.mjs` / `.esm` 格式的配置文件依赖可选依赖 [jiti](https://github.com/unjs/jiti) 解析：

```bash
pnpm add -D jiti
```

若不想安装，可改用 `console-highlight.config.json` 或 `.cjs`（走原生 `require`），
也可以直接把配置写进 `vite.config.js` 的插件参数。

### 配置文件和插件参数哪个生效？

优先级从高到低：**插件构造参数 → 独立配置文件 → `package.json` 的 `consoleHighlight` 字段 → 内置默认值**。

`include` / `exclude` 是例外，采用**叠加**语义而非覆盖，方便在共享配置基础上追加规则。

### 改配置文件需要重启吗？

Vite dev 下不需要。插件已 watch `package.json` 与全部候选配置文件名，
检测到实际变化时会自动重启 dev server；若修改后配置等价，会打印
`配置文件修改未产生实际变化` 而不重启。

### 如何在代码里判断插件是否启用？

插件注入了全局常量：

```ts
if (__CONSOLE_HIGHLIGHT__) {
  // 仅在被转换的构建中存在
}
```

TypeScript 项目需要在 `env.d.ts` 里声明一次：

```ts
declare const __CONSOLE_HIGHLIGHT__: boolean
```
