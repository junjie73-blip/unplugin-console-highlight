# Install

## Package manager

::: code-group

```bash [pnpm]
pnpm add -D unplugin-console-highlight
```

```bash [npm]
npm install -D unplugin-console-highlight
```

```bash [yarn]
yarn add -D unplugin-console-highlight
```

:::

## Build tool integration

::: code-group

```ts [vite.config.ts]
import { vitePlugin } from 'unplugin-console-highlight'

export default defineConfig({
  plugins: [vitePlugin()],
})
```

```js [rollup.config.js]
import { rollupPlugin } from 'unplugin-console-highlight'

export default {
  plugins: [rollupPlugin()],
}
```

```js [webpack.config.js]
const { webpackPlugin } = require('unplugin-console-highlight')

module.exports = {
  plugins: [webpackPlugin()],
}
```

```js [rspack.config.js]
const { rspackPlugin } = require('unplugin-console-highlight')

module.exports = {
  plugins: [rspackPlugin()],
}
```

```js [esbuild.config.js]
import { build } from 'esbuild'
import { esbuildPlugin } from 'unplugin-console-highlight'

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  plugins: [esbuildPlugin()],
})
```

```ts [farm.config.ts]
import { farmPlugin } from 'unplugin-console-highlight'

export default {
  plugins: [farmPlugin()],
}
```

:::

## Requirements

- Node.js >= 18
- Vite >= 3 (for other build tools, see their respective unplugin adapter versions)

## Optional dependency

A standalone config file in a format that needs compiling — `.ts` / `.mts` / `.mjs` — requires [jiti](https://github.com/unjs/jiti):

```bash
pnpm add -D jiti
```

Config files in `.js` / `.cjs` / `.json` need no extra dependency.
