# Best Practices

## Enable it only where you need it

Labels and coloring are a **development-time feature**; production builds usually don't want them. The cleanest setup is to enable the plugin per command:

```js
// vite.config.js
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig(({ command }) => ({
  plugins: [
    // 只在开发时启用，生产构建完全不介入
    command === 'serve' && vitePlugin(),
  ],
}))
```

To keep the location labels in production builds but drop the coloring:

```js
vitePlugin({ highlight: false })
```

## Deciding how much your label shows

The longer the label, the busier the console. Pick by debugging goal:

| Scenario | Recommended config |
| --- | --- |
| Day-to-day development | Default (icon + `file·line ~ function`) |
| Tracing calls across modules | `prefix: '{icon} {path}:{line}'`, which uses the full relative path |
| Grouping by icon only | `prefix: [{ type: 'icon' }]` |
| You want a timeline | `suffix: [{ type: 'time', glue: ' ' }]` |
| Clean output | `prefix: false` |

:::tip
`suffix` is off by default. Moving the time and the `[method]` tag to the suffix keeps "who logged this" right next to the message while "when it was logged" sinks to the end of the line — closer to the reading rhythm of the native console.
:::

## Fixed colors per module

By default `label.color: 'auto'` picks a color from the **filename**, so every log from one file shares a color. To pin a whole directory to one color (for example, everything under `store/` in purple), use the function form of `prefix`:

```ts
// console-highlight.config.ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  prefix: (ctx) => {
    const isStore = ctx.file.includes('/store/')
    return [
      { type: 'icon' },
      {
        type: 'text',
        value: isStore ? 'store' : ctx.file.replace(/^src\//, ''),
        glue: ' ',
        // store 目录固定紫色，其余按色板取色
        background: isStore ? '#7c3aed' : undefined,
      },
      { type: 'line', glue: '·' },
    ]
  },
})
```

The function's result is fixed when your code is built, so printing a log does no extra work at runtime.

## Keeping light and dark modes consistent

`highlight.mode` drives both the syntax colors and the label palette. When you customize colors, override the two together so a light chip never sits next to dark-mode body text:

```ts
vitePlugin({
  label: {
    mode: 'chip',
    palette: {
      light: ['#2563eb', '#059669', '#d97706'],
      dark: ['#60a5fa', '#34d399', '#fbbf24'],
    },
  },
  highlight: {
    mode: 'auto',
    tokens: {
      light: { key: '#0451a5', string: '#a31515' },
      dark: { key: '#9cdcfe', string: '#ce9178' },
    },
  },
})
```

:::warning
In chip mode, `label.textColor: 'auto'` picks black or white text based on the background brightness. If your custom palette includes very light colors (such as `#f0f0f0`), keep `auto` so the text stays readable.
:::

## Large objects and output cost

Printing deeply nested, large objects costs noticeable time. The default limits cover most cases; tighten them when you log very large state trees:

```ts
vitePlugin({
  highlight: {
    maxDepth: 3,          // 默认 4
    maxEntries: 20,       // 默认 50
    maxStringLength: 200, // 默认 500
  },
})
```

In the browser objects stay natively expandable, so the coloring cost mainly shows up in the terminal and in plain-text output. If you log at a high frequency (for example, in a render loop), cut down the number of `console` calls before you start tuning these limits.

## Narrowing the scope

`include` / `exclude` decide which files get labels. `node_modules` is already excluded; you can go further inside your project:

```js
vitePlugin({
  include: [/src\/.*\.(ts|tsx|vue)$/],
  exclude: [/src\/vendor/, /\.stories\./],
})
```

Processing only some methods is just as common — for example, keeping only `warn` / `error` in production builds:

```js
vitePlugin({ methods: ['warn', 'error'] })
```

## Pairing it with a standalone config file

Putting your options in `console-highlight.config.ts` instead of `vite.config.js` buys you:

- The dev server reloads when you edit the config file, with no manual restart
- Non-Vite tools such as webpack / rspack / esbuild / farm share the exact same config
- Multiple subprojects or packages can follow one logging convention

```ts
// console-highlight.config.ts
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🚀',
  suffix: [{ type: 'tag', glue: ' ' }],
  highlight: { mode: 'auto', maxDepth: 5 },
})
```

:::tip
Plugin arguments beat the config file, and the config file beats the defaults. To override a single field temporarily, write it inline in `vitePlugin({ ... })` — you don't have to touch the config file.
:::

## Confirming the plugin is active

Check in this order — it is the fastest way to find the problem:

1. Start the dev server, log anything with `console.log`, and see whether a colored chip label appears in front of it
2. Ask your code, with `__CONSOLE_HIGHLIGHT__` (see the [FAQ](/en/advanced/faq) for details):

```ts
if (__CONSOLE_HIGHLIGHT__) {
  console.log('插件已启用')
}
```

3. If you still see nothing, confirm that the file matches `include` and the method is listed in `methods`, and that this plugin isn't placed **before** a plugin that rewrites `console` — put it **last** in the plugins array.
