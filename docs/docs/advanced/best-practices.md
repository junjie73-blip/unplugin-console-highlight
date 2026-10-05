# 最佳实践

## 只在需要的环境启用

标签与着色是**开发期能力**，生产环境通常不需要。推荐按命令区分插件：

```js
// vite.config.js
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig(({ command }) => ({
  plugins: [
    // 只在开发时启用，生产构建完全不介入
    command === 'serve' && vitePlugin(),
  ],
}))
```

若生产构建也想保留定位标签、只去掉着色：

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

默认 `label.color: 'auto'` 按**文件名**取色，同一文件的所有日志颜色一致。
如果希望某个目录固定某个颜色（例如所有 `store/` 都是紫色），用函数形式的 `prefix`：

```ts
// console-highlight.config.ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  prefix: (ctx) => {
    const isStore = ctx.file.includes('/store/')
    return [
      { type: 'icon' },
      {
        type: 'text',
        value: isStore ? 'store' : ctx.file.replace(/^src\//, ''),
        glue: ' ',
        // store 目录固定紫色，其余按色板取色
        background: isStore ? '#7c3aed' : undefined,
      },
      { type: 'line', glue: '·' },
    ]
  },
})
```

函数形式的结果在打包时就已确定，日志输出时不会再额外计算。

## 亮暗模式的配色一致性

`highlight.mode` 同时驱动两件事：语法配色与标签色板。
自定义时建议两者一起覆盖，避免亮色标签配暗色正文：

```ts
vitePlugin({
  label: {
    mode: 'chip',
    palette: {
      light: ['#2563eb', '#059669', '#d97706'],
      dark: ['#60a5fa', '#34d399', '#fbbf24'],
    },
  },
  highlight: {
    mode: 'auto',
    tokens: {
      light: { key: '#0451a5', string: '#a31515' },
      dark: { key: '#9cdcfe', string: '#ce9178' },
    },
  },
})
```

:::warning
chip 模式下 `label.textColor: 'auto'` 会按背景亮度自动选黑 / 白文字。
如果自定义色板包含很浅的颜色（如 `#f0f0f0`），保持 `auto` 才能得到可读的深色文字。
:::

## 大对象与输出开销

打印深层大对象会带来明显开销。默认限制已能覆盖多数场景，
打印超大状态树时建议收紧：

```ts
vitePlugin({
  highlight: {
    maxDepth: 3,          // 默认 4
    maxEntries: 20,       // 默认 50
    maxStringLength: 200, // 默认 500
  },
})
```

浏览器里对象保持原生可展开展示，因此着色开销主要出现在终端与纯文本环境。
若日志频率很高（如渲染循环），优先考虑减少 `console` 调用而不是调参。

## 缩小处理范围

`include` / `exclude` 决定哪些文件会加上标签。默认已排除 `node_modules`，
项目内还可以进一步收窄：

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

- 修改配置文件后 dev server 自动重载，无需手动重启
- webpack / rspack / esbuild / farm 等非 Vite 框架共用同一份配置
- 多个子项目、多个包共享同一套日志规范

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

## 确认插件是否生效

按顺序检查最省事：

1. 启动 dev server，随便打一条 `console.log`，看前面有没有色块标签
2. 代码里用 `__CONSOLE_HIGHLIGHT__` 判断（详见[常见问题](/advanced/faq)）：

```ts
if (__CONSOLE_HIGHLIGHT__) {
  console.log('插件已启用')
}
```

3. 仍无效果时，确认该文件命中了 `include`、方法在 `methods` 里，
   以及本插件没有被放在会改写 `console` 的插件**之前**——建议把本插件放在插件数组的**末尾**。
