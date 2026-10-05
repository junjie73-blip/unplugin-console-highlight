# 值高亮与亮暗模式

## 值高亮

开启 `highlight`（默认）后，console 的**参数**会按类型着色显示：

```ts
console.log('user', { name: 'zy', age: 18, tags: ['a', 'b'] })
```

- 浏览器：字符串 / 数字 / 布尔 / null 等着色；**对象保持 devtools 原生展示**，仍可展开、可搜索、可点击跳转
- 终端：所有参数显示为着色文本，可复制
- 纯文本环境（CI、重定向到文件）：只显示标签与参数原文，不产生乱码

各类参数的显示效果：

| 参数类型 | 显示 |
| --- | --- |
| string | 首个字符串参数按日志正文显示（不加引号）；其余带引号，超过 `maxStringLength` 截断为 `…` |
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

token 类别：`message` `string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`（各方法标签色）。

`message` 用于**首个字符串参数**：它按日志正文渲染，不加引号、用近黑 / 近白正文色，
后续字符串参数才按 `string`（带引号）着色。

## 与手写格式指令共存

以 `%c` / `%s` / `%o` 等指令开头的字符串参数会被原样保留，插件只在其前面追加标签，
参数顺序不变：

```ts
console.log('%c👋 欢迎', 'color:#0d9488;font-weight:bold;')
// 标签照常出现，👋 仍是你的绿色加粗，不会漏出裸 %c 或样式串
console.log('覆盖率 100% 通过') // 文本中的 % 会转义，不会吞掉后续参数
```

## 环境控制

`highlight.env` 可强制输出环境（默认自动识别）：

```ts
vitePlugin({ highlight: { env: 'terminal' } }) // 强制终端配色（SSH / 远程调试时常用）
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
