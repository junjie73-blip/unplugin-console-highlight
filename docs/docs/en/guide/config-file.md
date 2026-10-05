# Standalone Config File

Beyond inlining options in your build config, the plugin supports a standalone config file and a `package.json` field, so multiple build tools can share one config.

## Config file

Looked up in this order (from the project root):

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
`.ts` / `.mts` / `.mjs` need [jiti](https://github.com/unjs/jiti) installed; `.js` / `.cjs` / `.json` need no extra dependency.
:::

## package.json field

```json [package.json]
{
  "consoleHighlight": {
    "icon": "🚀"
  }
}
```

## Precedence

**Inline config > standalone config file > package.json field > defaults**

`include` / `exclude` use **additive semantics** (merged across layers); every other field is overwritten.

## Vite dev server hot reload

The dev server reloads when you change the config file:

- If the change has no real effect: it only prints a note in the terminal and doesn't restart.
- If the change takes effect: it fires the `unplugin-console-highlight:config-update` event and restarts the server.
