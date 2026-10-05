# Exports & Types

This page lists the imports you need when writing configuration. For what each field does, see the [Options reference](/en/config/options).

## Plugin factories

Import the factory for the build tool you use. They all take the same configuration object:

| Export | Where to use it |
| --- | --- |
| `vitePlugin` | `vite.config.ts` |
| `rollupPlugin` | `rollup.config.js` |
| `webpackPlugin` | `webpack.config.js` |
| `rspackPlugin` | `rspack.config.js` |
| `esbuildPlugin` | The esbuild `plugins` array |
| `farmPlugin` | `farm.config.ts` |
| `default` | The unplugin instance, for a custom pipeline |
| `PLUGIN_NAME` | The plugin name string `'unplugin-console-highlight'` |

## Config helpers

```ts
import {
  defineConsoleHighlightConfig,
  defineLabel,
} from 'unplugin-console-highlight'

// 保留字面量类型，用于独立配置文件与内联配置
const config = defineConsoleHighlightConfig({
  methods: ['log', 'warn'],
  icon: { log: '🚀', warn: '⚠️' },
})

// 片段数组的类型推导辅助
const label = defineLabel([
  { type: 'icon' },
  { type: 'file', glue: ' ' },
])
```

Inference helpers:

```ts
import type { InferMethods, InferIcons } from 'unplugin-console-highlight'

type Methods = InferMethods<typeof config>  // 'log' | 'warn'
type Icons = InferIcons<typeof config>      // { log: '🚀', warn: '⚠️' }
```

## Global constant

Once the plugin is registered, your code can check whether it is active:

```ts
if (__CONSOLE_HIGHLIGHT__) {
  // 见常见问题：不同构建工具下的可用范围不同
}
```

TypeScript projects need one declaration:

```ts
declare const __CONSOLE_HIGHLIGHT__: boolean
```

To get the type without hardcoding the name, import the constant's name instead:

```ts
import { GLOBAL_FLAG_NAME } from 'unplugin-console-highlight' // '__CONSOLE_HIGHLIGHT__'
```

For details, see "How do I check in my code whether the plugin is enabled?" in the [FAQ](/en/advanced/faq).

## Default value references

To get back to a default or override part of it, reuse these exports:

| Export | Content |
| --- | --- |
| `DEFAULT_CONFIG` | The full default configuration |
| `DEFAULT_PREFIX` / `DEFAULT_LABEL` / `DEFAULT_ICONS` | Default prefix fragments, label style, and icons |
| `TOKEN_PRESETS` | Built-in `{ light, dark }` color sets |
| `LIGHT_PALETTE` / `DARK_PALETTE` | Built-in label palettes |
| `CONFIG_FILE_NAMES` / `PACKAGE_CONFIG_FIELD` | Candidate config file names and the `package.json` field name |
| `resolveTokens(overrides)` | Merges your color overrides and returns the light and dark sets |

```ts
import { DEFAULT_PREFIX, TOKEN_PRESETS } from 'unplugin-console-highlight'

// 例：在默认前缀后面追加时间片段
vitePlugin({
  prefix: [...DEFAULT_PREFIX, { type: 'time', glue: ' ' }],
  // 例：只改暗色的字符串颜色
  highlight: { tokens: { dark: { string: TOKEN_PRESETS.dark.string } } },
})
```

## Main types

```ts
type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'
type FilterPattern = RegExp | string | ReadonlyArray<RegExp | string>
type HighlightEnv = 'browser' | 'terminal' | 'plain'
type ColorMode = 'light' | 'dark'
type ModeOption = ColorMode | 'auto'
type TokenKind = 'message' | 'string' | 'number' | 'boolean' | 'nullish' | 'key' | 'punctuation' | 'callable' | 'special'
type LabelSegmentType = 'icon' | 'file' | 'path' | 'line' | 'function' | 'time' | 'tag' | 'method' | 'text'

interface LabelSegment { type: LabelSegmentType, value?: string, glue?: string, color?: string, background?: string }
interface LabelContext { method: ConsoleMethod, file: string, line: number, fn: string | null }
type LabelConfig = false | string | LabelSegment[]
type LabelInput = LabelConfig | ((ctx: LabelContext) => string | LabelSegment[])
interface LabelStyleOptions { mode?: 'chip' | 'text', color?: string | 'auto', palette?: ..., textColor?: string | 'auto', css?: string }
interface HighlightOptions { env?, mode?, maxDepth?, maxEntries?, maxStringLength?, tokens? }
interface ConsoleHighlightOptions { include?, exclude?, methods?, icon?, prefix?, suffix?, label?, timeFormat?, highlight?, root? }
```
