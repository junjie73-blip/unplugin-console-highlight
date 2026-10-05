# unplugin-console-highlight

[简体中文](./README.md) | English

> Console output with **location labels** and **syntax coloring**, for every build tool.

Every log line gets a chip label — icon, file, line number and enclosing function —
while its arguments are colored by type and follow your light / dark preference.
The same output reads well in browser DevTools, in a terminal, and in CI logs.
No changes to your existing `console` calls are required.

```
┌──────────────────────────┐
│ 🚀 service.js·6 ~ list   │  用户列表  [{ name: "zy", role: "admin" }]
└──────────────────────────┘
   ↑ chip label (colored per file)    ↑ message body is unquoted; strings, numbers and keys are colored separately
```

The output adapts to wherever it lands:

| Environment | What you see |
| --- | --- |
| 🌐 Browser | Primitives are colored; objects stay natively expandable and clickable in DevTools |
| 💻 Terminal (interactive) | True-color chip label and colored text |
| 📄 Anything else (CI, redirected files) | Plain-text label plus the original arguments, no escape-code noise |

Works with **Vite / Rollup / webpack / Rspack / esbuild / Farm**.

- **Locations stay accurate**: your line numbers are not shifted, `shebang` and
  `"use strict"` scripts keep working, so DevTools links, breakpoints and stack
  traces still point at the original source.
- **Flexible call syntax**: `console.log()`, `console?.log()`, `console.log?.()`,
  `console["log"]()` and `globalThis.console.log()` all get labels.
- **Your own styles survive**: hand-written `%c` directives keep working, and a plain
  `%` in a message (such as `100%`) is never treated as a format directive.
- **Check it from code**: the global constant `__CONSOLE_HIGHLIGHT__` is `true` while the
  plugin is active (anywhere in Vite; inside processed files for other build tools).

## Install

```bash
npm i -D unplugin-console-highlight
```

## Get started

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [vitePlugin()],
})
```

Other build tools:

```ts
import { rollupPlugin, webpackPlugin, rspackPlugin, esbuildPlugin, farmPlugin } from 'unplugin-console-highlight'
```

With no options at all you already get the `icon + file·line ~ function` chip label.

## Labels: prefix and suffix

```ts
vitePlugin({
  // 1) template string
  prefix: '{icon} {file}:{line} ~ {fn}',
  // 2) fragment array (per-fragment color and glue)
  suffix: [
    { type: 'tag', glue: ' ' },        // [LOG]
    { type: 'time', glue: ' ' },       // 2026-10-04 23:31:55
  ],
  // 3) function form (customized per call site)
  prefix: ctx => `‹${ctx.method}› ${ctx.file}:${ctx.line}`,
})

vitePlugin({ prefix: false }) // no labels at all
```

Available fragments: `icon` `file` `path` `line` `function` `time` `tag` `method` `text`;
template placeholders: `{icon}` `{file}` `{path}` `{line}` `{fn}` `{time}` `{tag}` `{method}`.

A fragment's `glue` is only emitted when that fragment renders, so a top-level call with no
function name never leaves a dangling ` ~ `.

### Label styling

```ts
vitePlugin({
  label: {
    mode: 'chip',        // 'chip' background (default) | 'text' foreground only
    color: 'auto',       // 'auto' picks per file, or pin it: '#2563eb'
    palette: { light: ['#2563eb', '#059669'], dark: ['#60a5fa', '#34d399'] },
    textColor: 'auto',   // 'auto' chooses black or white from the background luminance
    css: 'border-radius:4px;padding:2px 6px;font-weight:600;',
  },
})
```

## Value coloring and color modes

```ts
vitePlugin({
  highlight: {
    env: 'auto',         // 'auto' | 'browser' | 'terminal' | 'plain'
    mode: 'auto',        // 'auto' | 'light' | 'dark'
    maxDepth: 4,         // object expansion depth
    maxEntries: 50,      // cap for array / Map / Set / object entries
    maxStringLength: 500,
    tokens: {            // override colors per mode
      light: { message: '#1f2328', string: '#a31515', key: '#0451a5' },
      dark: { message: '#e6edf3', string: '#ce9178', key: '#9cdcfe' },
    },
  },
})

vitePlugin({ highlight: false }) // labels only, arguments printed as-is
```

- Light colors follow VSCode Light+, dark colors follow VSCode Dark+
- In the browser `mode: 'auto'` tracks the system theme and switches instantly; terminals default to dark
- `message` applies to the **first string argument** only: it is printed as the log body without
  quotes; later string arguments are quoted and colored as `string`

Color categories: `message` `string` `number` `boolean` `nullish` `key` `punctuation` `callable` `special` `prefix` `tags`.

## All options

| Option | Type | Default |
| --- | --- | --- |
| `include` | `FilterPattern` | `[/\.(js\|ts\|jsx\|tsx\|vue)$/]` (additive) |
| `exclude` | `FilterPattern` | `[/node_modules/]` (additive) |
| `methods` | `ConsoleMethod[]` | `['log','info','warn','error','debug']` |
| `icon` | `string \| Record<method,string> \| false` | per method: 📝 ℹ️ ⚠️ ❌ 🔍 |
| `prefix` | `LabelInput` | icon + `file·line ~ function` |
| `suffix` | `LabelInput` | `false` |
| `label` | `LabelStyleOptions` | chip / auto color / auto text color |
| `timeFormat` | `string \| false` | `'YYYY-MM-DD HH:mm:ss'` |
| `highlight` | `boolean \| HighlightOptions` | `true` |
| `root` | `string` | project root (Vite) or the current working directory |

`timeFormat` supports `YYYY` `YY` `MM` `DD` `HH` `mm` `ss` `SSS`.

### Type helpers

```ts
import { defineConsoleHighlightConfig, defineLabel } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🦄',
  prefix: defineLabel([{ type: 'icon' }, { type: 'file', glue: ' ' }]),
  highlight: { mode: 'dark', maxDepth: 3 },
})
```

### Standalone config file

Put `console-highlight.config.{ts,mts,mjs,js,cjs,json}` in the project root
(TS / ESM files need the extra `jiti` dependency), or declare a `consoleHighlight` field in `package.json`.

Precedence: **plugin argument → config file → package.json field → built-in defaults**
(`include` / `exclude` are additive). While the Vite dev server runs, config changes reload automatically
and are skipped when they make no difference.

## Examples

`examples/vanilla`, `examples/vue` and `examples/react` are runnable apps:

```bash
pnpm install
pnpm build         # build the plugin first
pnpm dev:vanilla   # plain JavaScript + Vite
pnpm dev:vue       # Vue 3
pnpm dev:react     # React 19
```

## Documentation

The documentation site lives in `docs/`: a guide, an options reference, API notes, examples and a FAQ,
in Chinese (`docs/docs/`) and English (`docs/docs/en/`). Preview it locally with `pnpm docs:dev`.

## Migrating from v1

v2 drops `timeSeparator` / `styles` / `theme` / `showFileName` / `showLineNumber` / `silentProduction`;
those are covered by `prefix` / `suffix` fragments plus `label` / `highlight.mode`.
See the Migration Guide in the docs.

## License

MIT
