# 值高亮与亮暗模式

## 值高亮

开启 `highlight`（默认）后，console 的**原始值**会被序列化并着色：

```ts
console.log('user', { name: 'zy', age: 18, tags: ['a', 'b'] })
```

- 浏览器：原始值（字符串 / 数字 / 布尔 / null 等）按 token 着色；**对象保留 `%o` 原生展示**，devtools 中仍可展开、可交互
- 终端：全部值序列化为带 ANSI 颜色的文本
- 纯文本环境：标签纯文本 + 参数原样透传

支持的序列化行为：

| 值类型 | 展示 |
| --- | --- |
| string | 带引号，超过 `maxStringLength` 截断为 `…` |
| number / bigint | 原样（`-0`、`10n` 特殊处理） |
| boolean / null / undefined | 原样 |
| function | `ƒ name()` |
| Date / RegExp / Error | ISO 字符串 / 字面量 / `Name: message` |
| Array / Map / Set | 结构展开，超过 `maxEntries` 显示 `+N` |
| 循环引用 | `[Circular]` |
| 超过 `maxDepth` | `…` |
| DOM 元素 | `<tag#id.class>` 摘要 |
| getter 抛错 | `[Getter threw: message]` |

关闭值高亮（仅保留标签、参数原样透传）：

```ts
vitePlugin({ highlight: false })
```

## 亮 / 暗模式

`highlight.mode` 控制 token 配色与标签色板：

```ts
vitePlugin({
  highlight: {
    mode: 'auto', // 'auto' | 'light' | 'dark'
  },
})
```

- 浏览器 `auto`：跟随 `prefers-color-scheme`（系统 / devtools 主题偏好）
- 终端 `auto`：默认暗色（多数终端为深色背景）
- 亮色 token 参考 VSCode Light+，暗色参考 VSCode Dark+

按模式覆盖 token：

```ts
vitePlugin({
  highlight: {
    mode: 'auto',
    tokens: {
      light: { string: '#b31d28', key: '#005cc5' },
      dark: { string: '#ffab70', key: '#79c0ff' },
    },
  },
})
```

token 类别：`string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`（各方法标签色）。

## 环境控制

`highlight.env` 可强制输出环境（默认 `auto` 探测）：

```ts
vitePlugin({ highlight: { env: 'terminal' } }) // 强制 ANSI
vitePlugin({ highlight: { env: 'plain' } })    // 强制纯文本（CI 日志友好）
```

## 展开与截断限制

```ts
vitePlugin({
  highlight: {
    maxDepth: 4,        // 对象展开深度
    maxEntries: 50,     // 数组 / Map / Set / 对象条目上限
    maxStringLength: 500, // 字符串截断长度
  },
})
```
