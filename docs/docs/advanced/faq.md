# 常见问题

## 一般

### 生产环境会有影响吗？

不注册插件就没有任何影响。注册后如果生产构建也带着插件，日志会多出标签文本，
因此推荐按命令启用：

```js
export default defineConfig(({ command }) => ({
  plugins: [command === 'serve' && vitePlugin()],
}))
```

即便保留到生产，输出也会先判断去处：CI、重定向到文件等非交互终端会自动降级为纯文本，
只留下标签文字和原始参数，不会出现彩色转义乱码。

### 支持哪些构建工具？

导出 Vite / Rollup / webpack / Rspack / esbuild / Farm 六套插件工厂，配置对象完全一致：

```js
import { vitePlugin, rollupPlugin, webpackPlugin, rspackPlugin, esbuildPlugin, farmPlugin } from 'unplugin-console-highlight'
```

具体注册方式见[安装](/guide/install)。

### 支持哪些语言与框架？

默认处理 `.js` `.ts` `.jsx` `.tsx` `.vue`，覆盖 Vue / React / Preact / 原生 JS 项目。
Svelte、Astro 等把扩展名加进 `include` 就行：

```js
vitePlugin({ include: [/\.(js|ts|jsx|tsx|vue|svelte|astro)$/] })
```

### 和 unplugin-turbo-console 能同时用吗？

不建议。两者都会给 `console` 加前缀，叠加后会出现双重标签、参数错位。
本插件的标签片段（`file` `line` `function` `time` `tag`）已覆盖定位能力，
并额外提供值的语法着色与亮暗模式，可以直接替换。

### 能和删除 console 的插件一起用吗？

可以，但要注意顺序：如果 `console` 调用先被删除，本插件就没有可加标签的地方。
调试期想让日志带标签、构建期把日志整体删掉时，把本插件放在插件数组的**末尾**即可。

## 标签

### 日志前没有出现标签？

按顺序检查：

1. 文件是否命中 `include`（默认只处理 js/ts/jsx/tsx/vue，`.svelte`、`.astro` 需自行添加）
2. 方法是否在 `methods` 里（默认 `log` `info` `warn` `error` `debug`）
3. 调用写法是否在支持范围内（见下条）
4. 是否有其他改写 `console` 的插件抢先处理（把本插件放到数组末尾）
5. 标签是否被关掉了（`prefix: false`，或函数形式返回了 `false`）
6. dev server 是否已经重启——修改配置后需要重启才会应用

### 哪些 console 写法会被处理？

支持的写法：

```js
console.log(1)              // ✔
console?.log(1)             // ✔ 可选调用语义保持不变
console.log?.(1)            // ✔
console["warn"](1)          // ✔ 字符串形式的成员访问
globalThis.console.error(1) // ✔ window / self / global 前缀同样支持
```

不支持的写法：

```js
const log = console.log     // ✘ 先把方法存进变量
log(1)                      // ✘ 由上式产生的调用
console[method](1)          // ✘ 方法名是变量
logger.info(1)              // ✘ 自定义 logger
```

别名形式无法可靠区分「模块级的 `const log = console.log`」和「同名的局部变量 / 形参」，
猜错会破坏你的运行逻辑，因此这几种写法一律不处理。
想统一日志出口时，在包装函数里显式写 `console.log(...)` 即可照常获得标签。

### 点击日志右侧的文件名能跳回正确的行吗？

可以，且这是有意保证的行为：插件不会打乱你文件的行号，脚本开头的 `shebang`
（`#!/usr/bin/env node`）和 `"use strict"` 也保持有效。
因此在 DevTools 里点击调用点、打断点、读错误堆栈，都落在原始源码位置。

:::warning
`.vue` 单文件组件里**标签显示的行号**来自编译后的脚本位置，
与 `.vue` 源文件行号可能相差几行；点击跳转仍然准确。
:::

### `{fn}` 为什么是空的？

以下几种情况取不到函数名，标签会自动省略该片段（连同它的粘合符）：

- 调用写在模块顶层，不在任何函数里
- 代码经过压缩 / 混淆，函数名已经丢失
- 极少数复杂嵌套写法

省略是有意设计：避免出现 `log.ts·4 ~ ` 这种带悬空分隔符的标签。

### 如何只显示图标？

```js
vitePlugin({ prefix: [{ type: 'icon' }] })
```

或保留默认片段、仅换图标：

```js
vitePlugin({ icon: '🚀' })                          // 全部方法共用
vitePlugin({ icon: { error: '💥', warn: '⚠️' } })   // 按方法定制
vitePlugin({ icon: false })                         // 关闭图标片段
```

### chip 色块颜色是怎么定的？

`label.color: 'auto'`（默认）时按**文件名**稳定取色，
同一文件的所有日志颜色一致、不同文件互相区分。
想要单色标签就指定固定值：`label: { color: '#2563eb' }`；
想换一批颜色就配 `label.palette`。

### 如何只给某几个目录加标签？

用 `include` 收窄范围（正则或字符串均可，字符串按子串匹配）：

```js
vitePlugin({ include: [/src\/api\//, /src\/utils\//] })
```

### 如何关闭时间显示？

时间只有在标签里出现 `{time}` / `{ type: 'time' }` 片段时才渲染。默认前缀不含时间，
若你添加了该片段又想去掉，删除片段即可；或全局关闭格式化：

```js
vitePlugin({ timeFormat: false })
```

`timeFormat` 支持占位符：`YYYY` `YY` `MM` `DD` `HH` `mm` `ss` `SSS`。

## 着色

### 浏览器里对象为什么还是原样展示？

这是刻意的。浏览器只给**原始值**着色，对象与数组保持 DevTools 原生展示，
这样你仍能展开、搜索、点击跳转。若希望对象也显示成着色文本，可在终端查看，或强制指定：

```js
vitePlugin({ highlight: { env: 'terminal' } })
```

### 终端里没有颜色？

终端着色需要交互式终端与真彩支持：

- 输出被重定向到文件、CI 日志时自动降级为纯文本
- Windows 老版本 cmd 不支持真彩，建议使用 Windows Terminal / PowerShell 7+
- 部分终端模拟器需开启 truecolor（如 tmux 需要 `set -ga terminal-overrides ",*:Tc"`）

### 单元测试里想要纯文本怎么办？

测试环境（vitest / jest）通常不需要彩色，强制纯文本即可：

```js
vitePlugin({ highlight: { env: 'plain' } })
```

### 输出里出现 `[Circular]` 或 `…` 是什么意思？

- `[Circular]`：该对象存在循环引用，这条分支停止展开
- `…`：达到 `maxDepth`（默认 4）后不再深入
- `+N`：数组 / 对象 / Map / Set 条目超过 `maxEntries`（默认 50）后的省略计数
- `abc…`：字符串超过 `maxStringLength`（默认 500）被截断

这些都是保护性限制，可通过 `highlight` 配置调整。

### 如何完全关闭着色、只保留标签？

```js
vitePlugin({ highlight: false })
```

此时只输出标签，`console` 的参数原样交给 DevTools，展开、堆栈定位等原生行为不受影响。

### 亮暗模式什么时候会切换？

`highlight.mode: 'auto'` 时：

- 浏览器：跟随系统 / DevTools 的主题偏好，切换后立即生效，无需刷新
- 终端：默认按暗色显示（多数终端是深色背景），需要亮色请显式 `mode: 'light'`

### 可以自己定义配色吗？

可以，按亮 / 暗模式分别覆盖：

```js
vitePlugin({
  highlight: {
    tokens: {
      light: { message: '#1f2328', key: '#0451a5' },
      dark: { message: '#e6edf3', key: '#9cdcfe' },
    },
  },
})
```

可用类别见[值高亮与亮暗模式](/guide/highlight)：`message` `string` `number` `boolean`
`nullish` `key` `punctuation` `callable` `special` `prefix` `tags`。

## 配置

### 报错 `加载 console-highlight.config.ts 需要安装 jiti`？

`.ts` / `.mts` / `.mjs` / `.esm` 格式的配置文件需要额外的解析依赖：

```bash
pnpm add -D jiti
```

若不想安装，可改用 `console-highlight.config.json` 或 `.cjs`，
也可以直接把配置写进 `vite.config.js` 的插件参数。

### 配置文件和插件参数哪个生效？

优先级从高到低：**插件构造参数 → 独立配置文件 → `package.json` 的 `consoleHighlight` 字段 → 内置默认值**。

`include` / `exclude` 是例外，采用**叠加**而非覆盖，方便在共享配置基础上追加规则。

### 改配置文件需要重启吗？

Vite 开发服务下不需要手动重启：插件会监听配置文件与 `package.json`，
检测到实际变化时自动重载。若改动后配置等价，只提示
`配置文件修改未产生实际变化` 而不重载。其他构建工具请手动重启。

### 如何在代码里判断插件是否启用？

插件提供一个全局常量 `__CONSOLE_HIGHLIGHT__`（注册插件时恒为 `true`）：

```ts
if (__CONSOLE_HIGHLIGHT__) {
  // 插件已启用时才会执行
}
```

TypeScript 项目需要在 `env.d.ts` 里声明一次：

```ts
declare const __CONSOLE_HIGHLIGHT__: boolean
```

可用范围按构建工具不同：

- **Vite**：全局可用，`include` 之外的文件（如 `.svelte`、`.css`）里同样能读到这个常量。
- **其他框架**（webpack / rspack / rollup / esbuild / Farm）：只在插件实际处理的文件里可用
  （默认覆盖 `.js` `.ts` `.jsx` `.tsx` `.vue`，`node_modules` 除外）。

需要「未注册插件也不报错」的写法，用 `typeof` 守卫：

```ts
const DEBUG = typeof __CONSOLE_HIGHLIGHT__ !== 'undefined'
```

:::tip
只有真正引用该变量的代码会被替换。字符串、注释里的同名文本、
`window.__CONSOLE_HIGHLIGHT__` 这样的成员访问、以及声明和赋值目标都保持原样，
因此你可以放心把它当普通全局变量使用。
:::
