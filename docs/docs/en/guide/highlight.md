# Value Highlighting & Light & Dark Modes

## Value highlighting

With `highlight` on (the default), console **arguments** are colored by type:

```ts
console.log('user', { name: 'zy', age: 18, tags: ['a', 'b'] })
```

- Browser: strings / numbers / booleans / null and so on are colored; **objects keep their native devtools display**, so they stay expandable, searchable, and clickable.
- Terminal: every argument shows as colored text you can copy.
- Plain text (CI, output redirected to a file): only the label and the raw arguments appear, with no mojibake.

How each argument type is shown:

| Argument type | Display |
| --- | --- |
| string | The first string is shown as the log message (no quotes); the rest are quoted, and any longer than `maxStringLength` is truncated with `…` |
| number / bigint | As-is (`-0` and `10n` get special handling) |
| boolean / null / undefined | As-is |
| function | `ƒ name()` |
| Date / RegExp / Error | ISO string / literal / `Name: message` |
| Array / Map / Set | Expanded structure; beyond `maxEntries`, shows `+N` |
| Circular reference | `[Circular]` |
| Beyond `maxDepth` | `…` |
| DOM element | `<tag#id.class>` summary |
| getter throws | `[Getter threw: message]` |

To turn value highlighting off (keep the label, pass arguments through untouched):

```ts
vitePlugin({ highlight: false })
```

## Light & dark modes

`highlight.mode` controls both the token colors and the label palette:

```ts
vitePlugin({
  highlight: {
    mode: 'auto', // 'auto' | 'light' | 'dark'
  },
})
```

- Browser `auto`: follows `prefers-color-scheme` (the system or devtools theme preference).
- Terminal `auto`: defaults to dark (most terminals have a dark background).
- Light tokens are based on VSCode Light+; dark tokens on VSCode Dark+.

Override tokens per mode:

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

Token categories: `message` `string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags` (the color for each method tag).

`message` applies to the **first string argument**: it renders as the log body, with no quotes and a near-black / near-white text color. Only the string arguments after it are colored as `string` (quoted).

## Coexisting with your own format directives

A string argument that starts with a directive such as `%c` / `%s` / `%o` is kept as-is; the plugin only prepends the label and leaves the argument order untouched:

```ts
console.log('%c👋 欢迎', 'color:#0d9488;font-weight:bold;')
// 标签照常出现，👋 仍是你的绿色加粗，不会漏出裸 %c 或样式串
console.log('覆盖率 100% 通过') // 文本中的 % 会转义，不会吞掉后续参数
```

## Environment control

`highlight.env` lets you force the output environment (auto-detected by default):

```ts
vitePlugin({ highlight: { env: 'terminal' } }) // 强制终端配色（SSH / 远程调试时常用）
vitePlugin({ highlight: { env: 'plain' } })    // 强制纯文本（CI 日志友好）
```

## Expansion and truncation limits

```ts
vitePlugin({
  highlight: {
    maxDepth: 4,        // 对象展开深度
    maxEntries: 50,     // 数组 / Map / Set / 对象条目上限
    maxStringLength: 500, // 字符串截断长度
  },
})
```
