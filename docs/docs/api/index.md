# 导出与类型

## 插件工厂

| 导出 | 说明 |
| --- | --- |
| `default` | unplugin 工厂实例 |
| `vitePlugin` / `rollupPlugin` / `webpackPlugin` / `rspackPlugin` / `esbuildPlugin` / `farmPlugin` | 各构建工具插件 |
| `PLUGIN_NAME` | 插件名常量 `'unplugin-console-highlight'` |

## 配置辅助

```ts
import {
  defineConsoleHighlightConfig,
  defineLabel,
} from 'unplugin-console-highlight'

// 保留字面量类型（const 泛型），用于独立配置文件与内联配置
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

推导工具类型：

```ts
import type { InferMethods, InferIcons } from 'unplugin-console-highlight'

type Methods = InferMethods<typeof config>  // 'log' | 'warn'
type Icons = InferIcons<typeof config>      // { log: '🚀', warn: '⚠️' }
```

## 运行时（`unplugin-console-highlight/runtime`）

零依赖运行时，通常无需直接使用；虚拟模块内部引用它。

| 导出 | 说明 |
| --- | --- |
| `createHighlight(options)` | 创建高亮器 `(method, meta, ...args) => unknown[]` |
| `detectEnv()` | 环境探测：`browser` / `terminal` / `plain` |
| `detectMode(env, mode)` | 亮暗模式解析 |
| `serializeToSegments(value, limits)` | 值 → token 片段列表 |
| `formatTime(date, format)` | 轻量时间格式化 |
| `hexToAnsi` / `hexToAnsiBackground` | 十六进制 → 24-bit ANSI |
| `contrastText(background)` | 背景亮度 → 对比前景色 |
| `hashString(text)` | 稳定字符串哈希（auto 取色） |

高亮器实例属性：`env`（当前环境）、`mode`（当前模式）、`stringify(value)`（纯文本序列化）。

## 构建期工具

| 导出 | 说明 |
| --- | --- |
| `transformCode(code, options, { id, root })` | 手动转换代码（测试 / 自定义流水线） |
| `VIRTUAL_MODULE_ID` | 虚拟模块 ID |
| `mergeConfig(...configs)` | 配置合并（含默认值） |
| `toRuntimeOptions(resolved)` | 归一化配置 → 可序列化运行时配置 |
| `shouldTransform(id, options)` | 模块过滤判断 |
| `getLineNumber(code, index)` | 偏移 → 行号 |
| `loadConfig(root)` / `CONFIG_FILE_NAMES` / `PACKAGE_CONFIG_FIELD` | 独立配置文件加载 |
| `deepEqual(a, b)` | 结构化深比较 |

## 常量与预设

| 导出 | 说明 |
| --- | --- |
| `DEFAULT_CONFIG` / `DEFAULT_PREFIX` / `DEFAULT_LABEL` / `DEFAULT_ICONS` | 默认配置与标签 |
| `TOKEN_PRESETS` | `{ light, dark }` 内置 token |
| `LIGHT_PALETTE` / `DARK_PALETTE` | 内置标签色板 |
| `resolveTokens(overrides)` | 按模式合并 token 覆盖 |

## 主要类型

```ts
type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'
type FilterPattern = RegExp | string | ReadonlyArray<RegExp | string>
type HighlightEnv = 'browser' | 'terminal' | 'plain'
type ColorMode = 'light' | 'dark'
type ModeOption = ColorMode | 'auto'
type TokenKind = 'string' | 'number' | 'boolean' | 'nullish' | 'key' | 'punctuation' | 'callable' | 'special'
type LabelSegmentType = 'icon' | 'file' | 'path' | 'line' | 'function' | 'time' | 'tag' | 'method' | 'text'

interface LabelSegment { type: LabelSegmentType, value?: string, glue?: string, color?: string, background?: string }
interface LabelContext { method: ConsoleMethod, file: string, line: number, fn: string | null }
type LabelConfig = false | string | LabelSegment[]
type LabelInput = LabelConfig | ((ctx: LabelContext) => string | LabelSegment[])
interface LabelStyleOptions { mode?: 'chip' | 'text', color?: string | 'auto', palette?: ..., textColor?: string | 'auto', css?: string }
interface HighlightOptions { env?, mode?, maxDepth?, maxEntries?, maxStringLength?, tokens? }
interface ConsoleHighlightOptions { include?, exclude?, methods?, icon?, prefix?, suffix?, label?, timeFormat?, highlight?, root? }
interface CallMeta { file: string, line: number, fn: string | null, prefix?: LabelConfig, suffix?: LabelConfig }
```
