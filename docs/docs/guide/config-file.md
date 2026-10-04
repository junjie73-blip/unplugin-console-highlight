# 独立配置文件

除构建配置内联外，插件支持独立配置文件与 `package.json` 字段，便于多构建工具共享同一份配置。

## 配置文件

按以下顺序查找（项目根目录）：

1. `console-highlight.config.ts`
2. `console-highlight.config.mts`
3. `console-highlight.config.mjs`
4. `console-highlight.config.js`
5. `console-highlight.config.cjs`
6. `console-highlight.config.json`

```ts [console-highlight.config.ts]
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🚀',
  suffix: [{ type: 'tag', glue: ' ' }],
  highlight: { mode: 'auto' },
})
```

::: tip
`.ts` / `.mts` / `.mjs` 需要安装 [jiti](https://github.com/unjs/jiti)；`.js` / `.cjs` / `.json` 无需额外依赖。
:::

## package.json 字段

```json [package.json]
{
  "consoleHighlight": {
    "icon": "🚀"
  }
}
```

## 优先级

**内联配置 > 独立配置文件 > package.json 字段 > 默认值**

其中 `include` / `exclude` 为**叠加语义**（多层配置合并），其余字段为覆盖语义。

## Vite dev server 热重载

修改配置文件后 dev server 自动重载：

- 配置未产生实际变化：仅在终端提示，不重启
- 配置变化：触发 `unplugin-console-highlight:config-update` 事件并重启 server
