# 最佳实践

## 只在需要的环境启用

标签与高亮是**开发期能力**，生产环境通常不需要。推荐按命令区分插件：

```js
// vite.config.js
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig(({ command }) => ({
  plugins: [
    // 仅 dev / 本地构建注入，生产构建完全不含运行时代码
    command === 'serve' && vitePlugin(),
  ],
}))
```

若生产构建也想保留定位标签、只去掉着色，可关闭值高亮：

```js
vitePlugin({ highlight: false })
```

## 标签信息量的取舍

标签越长，控制台越拥挤。按调试目的选择：

| 场景 | 推荐配置 |
| --- | --- |
| 日常开发 | 默认（图标 + `文件·行号 ~ 函数`） |
| 排查跨模块调用 | `prefix: '{icon} {path}:{line}'`，用完整相对路径 |
| 只看图标分组 | `prefix: [{ type: 'icon' }]` |
| 需要时间线 | `suffix: [{ type: 'time', glue: ' ' }]` |
| 纯净输出 | `prefix: false` |

:::tip
`suffix` 默认关闭。把时间、`[方法名]` 标签放后缀，可以让「谁打的日志」紧跟消息，
而「什么时候打的」沉到行尾，阅读节奏更接近原生 console。
:::

## 用固定色区分模块

默认 `label.color: 'auto'` 按**文件名哈希**取色，同一文件的所有日志颜色一致。
如果希望某个目录固定某个颜色（例如所有 `store/` 都是紫色），用函数形式的 `prefix`：

```ts
// console-highlight.config.ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  prefix: (ctx) => [
    { type: 'icon' },
    {
      type: 'text',
      value: ctx.file.replace(/^src\//, ''),
      glue: ' ',
      // 片段级 background 优先于整体色板
      background: ctx.file.includes('/store/') ? '#722ed1' : undefined,
    },
    { type: 'line', glue: '·' },
  ],
})
```

函数形式在**构建期**求值，结果序列化进产物，运行期没有额外计算开销。

## 亮暗模式的配色一致性

`highlight.mode` 同时驱动两件事：语法 token 配色与标签色板。
自定义时建议两者一起覆盖，避免亮色标签配暗色 token：

```ts
vitePlugin({
  label: {
    mode: 'chip',
    palette: {
      light: ['#0969da', '#1a7f37', '#9a6700'],
      dark: ['#58a6ff', '#3fb950', '#d29922'],
    },
  },
  highlight: {
    mode: 'auto',
    tokens: {
      light: { key: '#0550ae', string: '#0a3069' },
      dark: { key: '#79c0ff', string: '#a5d6ff' },
    },
  },
})
```

:::warning
chip 模式下 `label.textColor: 'auto'` 会按背景亮度自动选黑/白文字。
如果自定义色板包含很浅的颜色（如 `#f0f0f0`），保持 `auto` 才能得到可读的深色文字。
:::

## 大对象与性能

值序列化在**运行时**执行，深层大对象会带来可观开销。默认限制已能覆盖多数场景，
打印超大状态树时建议收紧：

```ts
vitePlugin({
  highlight: {
    maxDepth: 3,        // 默认 4
    maxEntries: 20,     // 默认 50
    maxStringLength: 200, // 默认 500
  },
})
```

浏览器环境下对象参数走 `%o` 原生展示（不序列化、可展开），因此真正的开销主要来自
终端与纯文本环境。若日志频率很高（如渲染循环），优先考虑减少 `console` 调用而不是调参。

## 缩小转换范围

`include` / `exclude` 决定哪些模块被改写。默认已排除 `node_modules`，
项目内还可以进一步收窄，减少构建开销与产物体积：

```js
vitePlugin({
  include: [/src\/.*\.(ts|tsx|vue)$/],
  exclude: [/src\/vendor/, /\.stories\./],
})
```

只处理特定方法也很常见，例如生产构建仅保留 `warn` / `error`：

```js
vitePlugin({ methods: ['warn', 'error'] })
```

## 与独立配置文件配合

把配置放进 `console-highlight.config.ts` 而不是 `vite.config.js`，好处是：

- 配置文件变更会触发 dev server 自动重启（插件已 watch 全部候选文件名）
- 非 Vite 框架（webpack / rspack / esbuild / farm）共用同一份配置
- 便于在 monorepo 中被子包继承

```ts
// console-highlight.config.ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🚀',
  suffix: [{ type: 'tag', glue: ' ' }],
  highlight: { mode: 'auto', maxDepth: 5 },
})
```

:::tip
插件构造参数优先级高于配置文件，配置文件高于默认值。临时覆盖某个字段时
直接写在 `vitePlugin({ ... })` 里即可，不必改配置文件。
:::

## 排查产物

想确认注入是否生效，可以检查构建产物里是否出现辅助函数调用：

```js
// 产物片段
import { highlight as __consoleHighlight } from 'virtual:console-highlight/runtime'
console.log(...__consoleHighlight('log', { file: 'src/main.js', line: 2, fn: null }, 'hello'))
```

看到 `virtual:console-highlight/runtime` 导入与展开调用即表示转换成功；
若完全没有，通常是文件未命中 `include`，或插件被放在了会先改写 `console` 的插件之后。
建议把本插件放在插件数组的**末尾**。
