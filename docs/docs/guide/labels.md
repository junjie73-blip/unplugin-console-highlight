# 前缀与后缀标签

标签（label）是插入在 console 参数**之前（prefix）**或**之后（suffix）**的一段带样式文本。
默认 prefix 为「图标 + 文件·行号 ~ 函数名」色块，suffix 默认关闭。

## 三种配置形态

### 1. 片段数组（推荐）

片段是最小配置单元，支持按片段设置颜色与背景：

```ts
vitePlugin({
  prefix: [
    { type: 'icon' },                    // 图标（取自 icon 配置）
    { type: 'file', glue: ' ' },         // 文件名（basename），glue 仅在片段渲染时前置
    { type: 'line', glue: '·' },         // 行号
    { type: 'function', glue: ' ~ ' },   // 函数名；顶层作用域时整段（含 glue）省略
  ],
  suffix: [
    { type: 'tag', glue: ' ' },          // [LOG] 形式的方法标签
    { type: 'time', glue: ' ' },         // 时间戳（受 timeFormat 控制）
  ],
})
```

可用片段类型：

| type | 内容 | 说明 |
| --- | --- | --- |
| `icon` | 图标 | 取自 `icon` 配置；可用 `value` 覆盖 |
| `file` | 文件名 | 相对路径的 basename |
| `path` | 相对路径 | 相对项目根（posix 风格） |
| `line` | 行号 | 调用所在行（从 1 开始） |
| `function` | 函数名 | 所在函数 / 方法 / 箭头函数名；顶层为 null 时省略 |
| `time` | 时间戳 | 运行期实时格式化，受 `timeFormat` 控制 |
| `tag` | `[LOG]` | 方法名大写标签 |
| `method` | `log` | 方法名小写原文 |
| `text` | 固定文本 | 由 `value` 指定 |

每个片段还可设置：

- `glue`：粘合文本，仅当该片段成功渲染时前置（避免顶层作用域留下孤立的 ` ~ `）
- `color`：前景色（十六进制）
- `background`：背景色；指定后该片段独立成块，可与主色块分色

### 2. 模板字符串

适合简单场景，占位符与片段一一对应：

```ts
vitePlugin({
  prefix: '{icon} {file}·{line} ~ {fn} {tag}',
  suffix: '‹{method}› {time}',
})
```

占位符：`{icon}` `{file}` `{path}` `{line}` `{fn}` `{time}` `{tag}` `{method}`。
模板整体共用一个样式块；`{fn}` 为空时展开为空字符串。

### 3. 函数（构建期求值）

函数在**构建期按调用点**求值，可拿到完整位置信息，返回模板或片段数组：

```ts
vitePlugin({
  prefix: ({ method, file, line, fn }) =>
    fn ? [{ type: 'text', value: `${fn}()`, background: '#722ed1' }] : false,
  suffix: ctx => `‹${ctx.method}#${ctx.line}›`,
})
```

::: tip
函数形式在构建期求值后序列化进产物，因此运行期零开销；但函数本身不能依赖运行时状态。
:::

## 视觉样式（label）

```ts
vitePlugin({
  label: {
    mode: 'chip',        // 'chip' 色块背景（默认） | 'text' 仅前景色
    color: 'auto',       // 'auto' 按文件名哈希取色 | 固定十六进制
    palette: {           // auto 取色色板，可按亮 / 暗模式分别配置
      light: ['#1890ff', '#faad14', '#52c41a', '#eb2f96'],
      dark: ['#1668dc', '#d89614', '#49aa19', '#c41d7f'],
    },
    textColor: 'auto',   // chip 前景色；'auto' 按背景亮度取黑 / 白
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;', // 附加 CSS（仅带背景片段）
  },
})
```

- `mode: 'text'` 时标签只着色文字、无色块，适合极简风格
- 片段级 `background` 优先级高于 `label.color`，可用于「图标一块、位置一块」的分色设计
- 终端环境下色块映射为 24-bit ANSI 背景色，`css` 被忽略

## 关闭标签

```ts
vitePlugin({ prefix: false })   // 关闭前缀
vitePlugin({ icon: false })    // 仅关闭图标片段
```
