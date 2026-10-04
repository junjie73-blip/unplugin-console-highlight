import { defineConfig } from 'rolldown'

export default defineConfig([
  // 插件本体（Node 侧）
  {
    input: 'src/index.ts',
    platform: 'node',
    external: ['vite', 'unplugin'],
    output: [
      { file: 'dist/index.mjs', format: 'es', exports: 'named' },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named' },
    ],
  },
  // 高亮运行时：供编程式使用（exports "./runtime"）
  {
    input: 'src/runtime/index.ts',
    platform: 'neutral',
    output: [
      { file: 'dist/runtime.mjs', format: 'es' },
      { file: 'dist/runtime.cjs', format: 'cjs' },
    ],
  },
  // 高亮运行时：IIFE 内联产物，由虚拟模块注入浏览器/终端代码
  {
    input: 'src/runtime/index.ts',
    platform: 'neutral',
    output: {
      file: 'dist/runtime.iife.js',
      format: 'iife',
      name: '__CONSOLE_HIGHLIGHT_RUNTIME__',
      minify: true,
    },
  },
])
