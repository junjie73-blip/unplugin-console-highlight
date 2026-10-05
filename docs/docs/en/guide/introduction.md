# Introduction

`unplugin-console-highlight` adds a **location label** and **colored message** to every `console` output, so your logs tell you *who logged what, and from where* at a glance — in browser DevTools, the terminal, and CI output. You don't change how you call `console`; just register the plugin.

## What it looks like

Browser DevTools (it picks the light palette when devtools is in light mode, and the dark palette otherwise):

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 log.ts·4 ~ logMessage</span> <span style="color:#1f2328">Hello TypeScript</span>

<span style="background:#d97706;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:600">📝 logjs.js·4 ~ logMessage</span> <span style="color:#1f2328">Hello JavaScript</span>

<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 App.vue·6 ~ message</span> <span style="color:#1f2328">Hello Vue</span>

Terminal (true color, chip label + colored message):

```text
📝 log.ts·4 ~ logMessage Hello TypeScript
```

## Core capabilities

| Capability | What you get |
| --- | --- |
| prefix / suffix labels | Combine icon, filename, path, line number, function name, time, and method tag, placed before or after your arguments |
| Automatic location | Every log carries its file, line number, and function name (arrow functions, class methods, object methods, and hook callbacks all work) |
| Colored message | Strings / numbers / booleans / keys / functions / Date / RegExp / Error each get their own color; objects stay expandable in the browser |
| Light & dark modes | Follows the system theme by default, and updates live when you switch the browser theme — no reload needed |
| Consistent across environments | One codebase for browser, terminal, and plain-text CI; each picks the styles it supports, so you never get mojibake |
| Multiple build tools | Vite / Rollup / webpack / Rspack / esbuild / Farm, all with the exact same configuration |
| Coexists with your own styling | Your own `%c` style strings still work as usual, and a plain `%` in your text won't swallow the arguments after it |

## When to use it (and when not to)

**Good for**: local debugging, Node scripts and SSR output, CI logs you want to trace later, and standardizing log format across a team.

**Not handled by default** (rewrite these into a normal call to get a label):

```js
const log = console.log   // ✘ 先把方法存进变量再调用
log(1)
console[method](1)        // ✘ 方法名是变量
logger.info(1)            // ✘ 自定义 logger
```

These all get labels normally:

```js
console.log(1)              // ✔
console?.log(1)             // ✔
console.log?.(1)            // ✔
console["warn"](1)          // ✔
globalThis.console.error(1) // ✔ window / self / global 前缀同样支持
```

## Next steps

- [Install](/en/guide/install): add the dependency and register it with your build tool
- [Quick Start](/en/guide/quick-start): see your first labeled log in three steps
- [Options reference](/en/config/options): every option and its default
- [FAQ](/en/advanced/faq): how to troubleshoot missing labels or colorless terminal output
