# 配置项参考

所有配置项均可选。类型定义见 [API](/api/index)。

## 顶层配置

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `include` | `FilterPattern` | `[/\.(js\|ts\|jsx\|tsx\|vue)$/]` | 需要转换的文件；叠加语义 |
| `exclude` | `FilterPattern` | `[/node_modules/]` | 排除的文件；叠加语义；`node_modules` 恒排除 |
| `methods` | `ConsoleMethod[]` | 全部五种 | 需要处理的 console 方法 |
| `icon` | `string \| Partial<Record<ConsoleMethod, string>> \| false` | 📝 ℹ️ ⚠️  🔍 | 图标（`icon` 片段的内容） |
| `prefix` | `LabelInput` | 图标 + 文件·行号 ~ 函数名 | 前缀标签 |
| `suffix` | `LabelInput` | `false` | 后缀标签 |
| `label` | `LabelStyleOptions` | chip + auto 取色 | 标签视觉样式 |
| `timeFormat` | `string \| false` | `'YYYY-MM-DD HH:mm:ss'` | `time` 片段格式；`false` 关闭 |
| `highlight` | `boolean \| HighlightOptions` | `true` | 值高亮配置 |
| `root` | `string` | Vite `config.root` / `process.cwd()` | 项目根（配置文件定位与相对路径计算） |

`FilterPattern` = `RegExp | string | (RegExp | string)[]`；字符串按子串匹配，正则按 `test` 匹配。

## LabelInput

```ts
type LabelInput =
  | false                                   // 关闭
  | string                                  // 模板：{icon} {file} {path} {line} {fn} {time} {tag} {method}
  | LabelSegment[]                          // 片段数组
  | ((ctx: LabelContext) => string | LabelSegment[])  // 构建期按调用点求值
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

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `'icon' \| 'file' \| 'path' \| 'line' \| 'function' \| 'time' \| 'tag' \| 'method' \| 'text'` | 片段类型 |
| `value` | `string` | `text` 内容；`icon` / `tag` / `method` 的覆盖值 |
| `glue` | `string` | 粘合文本，仅片段渲染时前置 |
| `color` | `string` | 前景色（十六进制） |
| `background` | `string` | 背景色；指定后独立成块 |

## LabelStyleOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `'chip' \| 'text'` | `'chip'` | 色块背景 / 仅前景色 |
| `color` | `string \| 'auto'` | `'auto'` | 主色；auto 按文件名哈希取色 |
| `palette` | `string[] \| { light?: string[], dark?: string[] }` | 内置 8 色 ×2 | auto 取色色板 |
| `textColor` | `string \| 'auto'` | `'auto'` | chip 前景色；auto 按亮度取黑 / 白 |
| `css` | `string` | `border-radius:4px;padding:2px 6px;font-weight:600;` | 附加 CSS（仅带背景片段，浏览器生效） |

## HighlightOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `env` | `'auto' \| 'browser' \| 'terminal' \| 'plain'` | `'auto'` | 输出环境 |
| `mode` | `'auto' \| 'light' \| 'dark'` | `'auto'` | 亮暗模式 |
| `maxDepth` | `number` | `4` | 对象展开深度 |
| `maxEntries` | `number` | `50` | 条目上限 |
| `maxStringLength` | `number` | `500` | 字符串截断长度 |
| `tokens` | `{ light?: PartialTokens, dark?: PartialTokens }` | VSCode Light+ / Dark+ | 按模式覆盖 token |

## 默认前缀片段

```ts
[
  { type: 'icon' },
  { type: 'file', glue: ' ' },
  { type: 'line', glue: '·' },
  { type: 'function', glue: ' ~ ' },
]
```
