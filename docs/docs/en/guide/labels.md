# Prefix & Suffix Labels

A label is a styled piece of text inserted **before (prefix)** or **after (suffix)** your console arguments. By default the prefix is a chip with "icon + file·line ~ function"; the suffix is off.

## Three configuration forms

### 1. Fragment array (recommended)

A fragment is the smallest unit, and each one can have its own color and background:

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

Available fragment types:

| type | Content | Notes |
| --- | --- | --- |
| `icon` | Icon | Taken from the `icon` option; override it with `value` |
| `file` | Filename | The basename of the relative path |
| `path` | Relative path | Relative to the project root (posix style) |
| `line` | Line number | The line of the call (1-based) |
| `function` | Function name | The enclosing function / method / arrow function name; omitted at the top level (null) |
| `time` | Timestamp | The current time at each output, formatted by `timeFormat` |
| `tag` | `[LOG]` | The method name, uppercased |
| `method` | `log` | The method name as written, lowercased |
| `text` | Fixed text | Set with `value` |

Each fragment also accepts:

- `glue`: text prepended only when that fragment actually renders (so a top-level scope doesn't leave a stray ` ~ `)
- `color`: the foreground color (hex)
- `background`: the background color; once set, the fragment becomes its own block and can differ from the main chip color

### 2. Template string

Good for simple cases; the placeholders map one-to-one to fragments:

```ts
vitePlugin({
  prefix: '{icon} {file}·{line} ~ {fn} {tag}',
  suffix: '‹{method}› {time}',
})
```

Placeholders: `{icon}` `{file}` `{path}` `{line}` `{fn}` `{time}` `{tag}` `{method}`.
The whole template shares a single style block; when `{fn}` is empty, it expands to an empty string.

### 3. Function (per call site)

The function form receives the full location of the current call site and returns a template string or a fragment array:

```ts
vitePlugin({
  prefix: ({ method, file, line, fn }) =>
    fn ? [{ type: 'text', value: `${fn}()`, background: '#7c3aed' }] : false,
  suffix: ctx => `‹${ctx.method}#${ctx.line}›`,
})
```

::: tip
The function form's result is fixed when your code is built, so don't depend on runtime-only state (live data, user input). For timestamps, use the `time` fragment — it reads the current time on every output.
:::

## Visual style (label)

```ts
vitePlugin({
  label: {
    mode: 'chip',        // 'chip' 色块背景（默认） | 'text' 仅前景色
    color: 'auto',       // 'auto' 按文件名哈希取色 | 固定十六进制
    palette: {           // auto 取色色板，可按亮 / 暗模式分别配置
      light: ['#2563eb', '#d97706', '#059669', '#e11d48'],
      dark: ['#60a5fa', '#fbbf24', '#34d399', '#fb7185'],
    },
    textColor: 'auto',   // chip 前景色；'auto' 按背景亮度取黑 / 白
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;', // 附加 CSS（仅带背景片段）
  },
})
```

- With `mode: 'text'`, only the text is colored and there's no chip — a minimalist look.
- A fragment's `background` takes priority over `label.color`, so you can split the label into separate blocks (for example, one for the icon, one for the location).
- `css` has no effect in the terminal and plain-text environments (the terminal simulates the chip with a background color, and plain text outputs only the characters).

## Turning labels off

```ts
vitePlugin({ prefix: false })   // 关闭前缀
vitePlugin({ icon: false })    // 仅关闭图标片段
```
