# FAQ

## General

### Does it affect production?

If you don't register the plugin, nothing changes at all. If you do register it and your production build keeps the plugin, the logs carry extra label text — so enabling it per command is the recommended setup:

```js
export default defineConfig(({ command }) => ({
  plugins: [command === 'serve' && vitePlugin()],
}))
```

Even if you keep it in production, the output still checks where it's going: CI runs and redirected (non-interactive) terminals automatically fall back to plain text, leaving only the label text and your original arguments — no stray color escape sequences.

### Which build tools are supported?

Six plugin factories are exported — Vite / Rollup / webpack / Rspack / esbuild / Farm — and they all take the same configuration object:

```js
import { vitePlugin, rollupPlugin, webpackPlugin, rspackPlugin, esbuildPlugin, farmPlugin } from 'unplugin-console-highlight'
```

See [Installation](/en/guide/install) for how to register each one.

### Which languages and frameworks are supported?

By default `.js` `.ts` `.jsx` `.tsx` `.vue` are processed, which covers Vue / React / Preact / vanilla JS projects. For Svelte, Astro and friends, add the extension to `include`:

```js
vitePlugin({ include: [/\.(js|ts|jsx|tsx|vue|svelte|astro)$/] })
```

### Can I use it together with unplugin-turbo-console?

Not recommended. Both prefix your `console` calls, so combining them produces doubled labels and misaligned arguments. This plugin's label segments (`file` `line` `function` `time` `tag`) already cover the locating side, and add syntax coloring plus light/dark modes on top, so you can replace it directly.

### Can I use it together with a plugin that strips console calls?

Yes, but order matters: if the `console` calls are removed first, this plugin has nowhere to attach labels. When you want labeled logs during development and fully stripped logs in the build, put this plugin at the **end** of the plugins array.

## Labels

### No label appears in front of my logs?

Check these in order:

1. Whether the file matches `include` (only js/ts/jsx/tsx/vue by default — add `.svelte`, `.astro` yourself)
2. Whether the method is in `methods` (`log` `info` `warn` `error` `debug` by default)
3. Whether the call syntax is supported (see the next question)
4. Whether another plugin that rewrites `console` runs first (move this plugin to the end of the array)
5. Whether labels are switched off (`prefix: false`, or your function form returned `false`)
6. Whether the dev server was restarted — config changes only apply after a restart

### Which `console` styles get processed?

Supported:

```js
console.log(1)              // ✔
console?.log(1)             // ✔ optional-call semantics are preserved
console.log?.(1)            // ✔
console["warn"](1)          // ✔ string-form member access
globalThis.console.error(1) // ✔ window / self / global prefixes work too
```

Not supported:

```js
const log = console.log     // ✘ the method was stored in a variable first
log(1)                      // ✘ a call produced by the line above
console[method](1)          // ✘ the method name is a variable
logger.info(1)              // ✘ a custom logger
```

Aliased forms can't reliably tell a module-level `const log = console.log` apart from a local variable or parameter with the same name, and guessing wrong would change your runtime behaviour — so none of those are touched. If you want a single logging entry point, just write `console.log(...)` explicitly inside your wrapper and the label still appears.

### Does clicking the filename on the right of a log jump to the right line?

Yes, and this is behaviour we deliberately guarantee: the plugin never shifts your line numbers, and the leading `shebang` (`#!/usr/bin/env node`) and `"use strict"` stay intact. So clicking a call site in DevTools, setting breakpoints, and reading error stacks all land on the original source location.

:::warning
Inside `.vue` single-file components, the **line number shown in the label** comes from the compiled script position and can be a few lines off from the `.vue` source file. Clicking still jumps correctly.
:::

### Why is `{fn}` empty?

The function name is unavailable in these cases, and the label drops that segment (along with its glue):

- The call sits at module top level, not inside any function
- The code is minified / obfuscated, so function names are gone
- A handful of deeply nested patterns

Dropping is intentional: it avoids labels with a dangling separator, like `log.ts·4 ~ `.

### How do I show only the icon?

```js
vitePlugin({ prefix: [{ type: 'icon' }] })
```

Or keep the default segments and only change the icon:

```js
vitePlugin({ icon: '🚀' })                          // shared by all methods
vitePlugin({ icon: { error: '💥', warn: '⚠️' } })   // per method
vitePlugin({ icon: false })                         // drop the icon segment
```

### How is the chip color decided?

With `label.color: 'auto'` (the default), the color is derived from the **filename**, so all logs from one file share a color and different files stay distinguishable. Want a single fixed color? Set one: `label: { color: '#2563eb' }`. Want a different set of colors? Configure `label.palette`.

### How do I add labels only to a few directories?

Narrow the scope with `include` (regex or string, where strings match by substring):

```js
vitePlugin({ include: [/src\/api\//, /src\/utils\//] })
```

### How do I turn the time off?

Time renders only when a `{time}` / `{ type: 'time' }` segment appears in the label. The default prefix has no time; if you added one and want it gone, remove the segment — or disable formatting globally:

```js
vitePlugin({ timeFormat: false })
```

`timeFormat` supports the placeholders `YYYY` `YY` `MM` `DD` `HH` `mm` `ss` `SSS`.

## Coloring

### Why do objects still look native in the browser?

That's on purpose. The browser only colors **primitive values**; objects and arrays keep their native DevTools presentation, so you can still expand, search, and click through them. If you want objects rendered as colored text too, view them in a terminal, or force it:

```js
vitePlugin({ highlight: { env: 'terminal' } })
```

### No colors in my terminal?

Terminal coloring needs an interactive terminal with truecolor support:

- When output is redirected to a file or to CI logs, it degrades to plain text automatically
- Older Windows cmd doesn't support truecolor — use Windows Terminal or PowerShell 7+
- Some terminal emulators need truecolor enabled (tmux, for example, needs `set -ga terminal-overrides ",*:Tc"`)

### I want plain text in unit tests

Test runners (vitest / jest) usually don't need color — force plain text:

```js
vitePlugin({ highlight: { env: 'plain' } })
```

### What do `[Circular]` and `…` in the output mean?

- `[Circular]`: the object has a circular reference, so that branch stops expanding
- `…`: `maxDepth` (default 4) was reached, so it doesn't go deeper
- `+N`: the omitted-entry count once array / object / Map / Set entries exceed `maxEntries` (default 50)
- `abc…`: the string was truncated because it exceeded `maxStringLength` (default 500)

These are all protective limits, adjustable through the `highlight` options.

### How do I disable coloring entirely and keep only the label?

```js
vitePlugin({ highlight: false })
```

Only the label is printed then; the `console` arguments go to DevTools untouched, so expanding objects and stack locating keep their native behaviour.

### When does the light/dark mode switch?

With `highlight.mode: 'auto'`:

- Browser: follows the system / DevTools theme preference and applies immediately after a switch, no reload needed
- Terminal: defaults to dark (most terminals have a dark background) — set `mode: 'light'` explicitly when you need light

### Can I define my own palette?

Yes, overriding the light and dark modes separately:

```js
vitePlugin({
  highlight: {
    tokens: {
      light: { message: '#1f2328', key: '#0451a5' },
      dark: { message: '#e6edf3', key: '#9cdcfe' },
    },
  },
})
```

The available categories are listed in [Value Coloring & Color Modes](/en/guide/highlight): `message` `string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`.

## Configuration

### I get `加载 console-highlight.config.ts 需要安装 jiti`

`.ts` / `.mts` / `.mjs` / `.esm` config files need an extra parser dependency:

```bash
pnpm add -D jiti
```

If you'd rather not install it, use `console-highlight.config.json` or `.cjs`, or put the config straight into the plugin options in `vite.config.js`.

### Do the plugin options or the config file win?

Precedence, from highest to lowest: **plugin constructor options → standalone config file → the `consoleHighlight` field in `package.json` → built-in defaults**.

`include` / `exclude` are the exception — they **merge** rather than override, so you can append rules on top of a shared config.

### Do I need to restart after editing the config file?

Not with the Vite dev server: the plugin watches the config file and `package.json`, and reloads when it detects an actual change. If the edit is equivalent to the previous config, it only prints `配置文件修改未产生实际变化` and skips the reload. For other build tools, restart manually.

### How do I check in my code whether the plugin is enabled?

The plugin exposes a global constant `__CONSOLE_HIGHLIGHT__` (always `true` once the plugin is registered):

```ts
if (__CONSOLE_HIGHLIGHT__) {
  // only runs when the plugin is enabled
}
```

TypeScript projects need one declaration in `env.d.ts`:

```ts
declare const __CONSOLE_HIGHLIGHT__: boolean
```

Availability differs by build tool:

- **Vite**: available everywhere, including files outside `include` (such as `.svelte` and `.css`).
- **Other frameworks** (webpack / rspack / rollup / esbuild / Farm): available only in files the plugin actually processes (by default `.js` `.ts` `.jsx` `.tsx` `.vue`, excluding `node_modules`).

If you need code that doesn't throw when the plugin isn't registered, guard with `typeof`:

```ts
const DEBUG = typeof __CONSOLE_HIGHLIGHT__ !== 'undefined'
```

:::tip
Only real references to the variable get substituted. The same text inside strings and comments, member access like `window.__CONSOLE_HIGHLIGHT__`, and declarations and assignment targets are all left as-is — so you can treat it like an ordinary global variable.
:::
