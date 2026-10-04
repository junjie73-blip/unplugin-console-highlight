# 安装

## 包管理器

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

## 构建工具集成

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

## 环境要求

- Node.js >= 18
- Vite >= 3（其他构建工具见各自 unplugin 适配版本）

## 可选依赖

独立配置文件为 `.ts` / `.mts` / `.mjs` 等需要编译的格式时，需要安装 [jiti](https://github.com/unjs/jiti)：

```bash
pnpm add -D jiti
```

`.js` / `.cjs` / `.json` 配置文件无需额外依赖。
