# Options Reference

Every option is optional. For the type definitions, see the [API](/en/api/index).

## Top-level options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `include` | `FilterPattern` | `[/\.(js\|ts\|jsx\|tsx\|vue)$/]` | Files to process; additive semantics |
| `exclude` | `FilterPattern` | `[/node_modules/]` | Files to skip; additive semantics; `node_modules` is always excluded |
| `methods` | `ConsoleMethod[]` | All five | Which console methods to process |
| `icon` | `string \| Partial<Record<ConsoleMethod, string>> \| false` | 📝 ℹ️ ⚠️  🔍 | Icon (the content of the `icon` fragment) |
| `prefix` | `LabelInput` | Icon + file·line ~ function | Prefix label |
| `suffix` | `LabelInput` | `false` | Suffix label |
| `label` | `LabelStyleOptions` | Chip + `auto` colors | Visual style of the label |
| `timeFormat` | `string \| false` | `'YYYY-MM-DD HH:mm:ss'` | Format of the `time` fragment; `false` turns it off |
| `highlight` | `boolean \| HighlightOptions` | `true` | Value highlighting |
| `root` | `string` | Vite `config.root` / `process.cwd()` | Project root, used to find the config file and compute relative paths |

`FilterPattern` = `RegExp | string | (RegExp | string)[]`; strings match as substrings, regular expressions with `test`.

## LabelInput

```ts
type LabelInput =
  | false                                   // 关闭
  | string                                  // 模板：{icon} {file} {path} {line} {fn} {time} {tag} {method}
  | LabelSegment[]                          // 片段数组
  | ((ctx: LabelContext) => string | LabelSegment[])  // 函数：按调用点定制
```

```ts
interface LabelContext {
  method: ConsoleMethod   // 'log' | 'info' | 'warn' | 'error' | 'debug'
  file: string            // 相对项目根路径（posix）
  line: number            // 行号（从 1 开始）
  fn: string | null       // 所在函数名；顶层为 null
}
```

## LabelSegment

| Field | Type | Description |
| --- | --- | --- |
| `type` | `'icon' \| 'file' \| 'path' \| 'line' \| 'function' \| 'time' \| 'tag' \| 'method' \| 'text'` | Fragment type |
| `value` | `string` | Content of `text`; an override for `icon` / `tag` / `method` |
| `glue` | `string` | Glue text, prepended only when the fragment actually renders |
| `color` | `string` | Foreground color (hex) |
| `background` | `string` | Background color; once set, the fragment becomes its own block |

## LabelStyleOptions

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'chip' \| 'text'` | `'chip'` | Colored block background, or foreground color only |
| `color` | `string \| 'auto'` | `'auto'` | Main color; `auto` picks one from a hash of the filename |
| `palette` | `string[] \| { light?: string[], dark?: string[] }` | Built-in 8 colors ×2 | Palette used for `auto` colors |
| `textColor` | `string \| 'auto'` | `'auto'` | Chip foreground; `auto` picks black or white by background brightness |
| `css` | `string` | `border-radius:4px;padding:2px 6px;font-weight:600;` | Extra CSS (background fragments only, browser only) |

## HighlightOptions

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `env` | `'auto' \| 'browser' \| 'terminal' \| 'plain'` | `'auto'` | Output environment |
| `mode` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Light & dark color mode |
| `maxDepth` | `number` | `4` | How deep to expand objects |
| `maxEntries` | `number` | `50` | Maximum number of entries |
| `maxStringLength` | `number` | `500` | Where to truncate strings |
| `tokens` | `{ light?: PartialTokens, dark?: PartialTokens }` | VSCode Light+ / Dark+ | Override tokens per mode |

## Default prefix fragments

```ts
[
  { type: 'icon' },
  { type: 'file', glue: ' ' },
  { type: 'line', glue: '·' },
  { type: 'function', glue: ' ~ ' },
]
```
