import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { build } from 'vite'
import { CONFIG_FILE_NAMES, loadConfig, PACKAGE_CONFIG_FIELD } from '../src/config/loader'

const currentDir = import.meta.dirname

interface BuildChunk {
  type: string
  code?: string
}

const tempDirs: string[] = []

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'uch-loader-'))
  tempDirs.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('loadConfig', () => {
  it('无配置时返回空对象', () => {
    const dir = makeTempDir()
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({})
    expect(loaded.configFile).toBeNull()
  })

  it('加载 JSON 配置文件', () => {
    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'console-highlight.config.json'),
      JSON.stringify({ icon: '🚀', timeFormat: false }),
    )
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({ icon: '🚀', timeFormat: false })
    expect(loaded.configFile).toBe(path.join(dir, 'console-highlight.config.json'))
  })

  it('加载 TS 配置文件（jiti，default 导出）', () => {
    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'console-highlight.config.ts'),
      `import type { ConsoleHighlightOptions } from '${path.resolve(currentDir, '../src/types/index.ts').replace(/\\/g, '/')}'
export default {
  icon: '🦄',
  highlight: { mode: 'dark', maxDepth: 3 },
} satisfies ConsoleHighlightOptions
`,
    )
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({ icon: '🦄', highlight: { mode: 'dark', maxDepth: 3 } })
  })

  it('加载 ESM .mjs 配置文件', () => {
    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'console-highlight.config.mjs'),
      'export default { label: { mode: "text" } }\n',
    )
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({ label: { mode: 'text' } })
  })

  it('独立配置文件优先于 package.json 字段', () => {
    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', [PACKAGE_CONFIG_FIELD]: { icon: '📦' } }),
    )
    writeFileSync(
      path.join(dir, 'console-highlight.config.json'),
      JSON.stringify({ icon: '🗂️' }),
    )
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({ icon: '🗂️' })
  })

  it('回退读取 package.json 的 consoleHighlight 字段', () => {
    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', [PACKAGE_CONFIG_FIELD]: { icon: '📦' } }),
    )
    const loaded = loadConfig(dir)
    expect(loaded.config).toEqual({ icon: '📦' })
    expect(loaded.configFile).toBeNull()
  })

  it('配置文件名列表符合约定', () => {
    expect(CONFIG_FILE_NAMES).toContain('console-highlight.config.ts')
    expect(CONFIG_FILE_NAMES).toContain('console-highlight.config.json')
  })
})

describe('构建产物注入（e2e）', () => {
  it('vite build 产物包含运行时且不含旧版样式/文件名残留', async () => {
    expect(existsSync(path.resolve(currentDir, '../dist/runtime.iife.js'))).toBe(true)

    const dir = makeTempDir()
    writeFileSync(
      path.join(dir, 'index.html'),
      '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
    )
    writeFileSync(
      path.join(dir, 'main.js'),
      `const payload = { user: 'zy', age: 18, tags: ['a', 'b'] }
console.log('hello', payload)
console.error('boom', new Error('x'))
globalThis.MARKER = 'MARKER-UNCHANGED'
`,
    )

    const { vitePlugin } = await import('../src/index')
    const result = await build({
      root: dir,
      logLevel: 'silent',
      build: { write: false, minify: false },
      plugins: [vitePlugin({ icon: '🧪' })],
    }) as unknown as { output: BuildChunk[] } | { output: BuildChunk[] }[]

    const outputs = Array.isArray(result) ? result.flatMap(r => r.output) : result.output
    const bundleCode = outputs
      .filter(chunk => chunk.type === 'chunk')
      .map(chunk => 'code' in chunk ? chunk.code : '')
      .join('\n')

    // 运行时被注入
    expect(bundleCode).toContain('createHighlight')
    expect(bundleCode).toContain('__CONSOLE_HIGHLIGHT_RUNTIME__')
    // 调用被转换并携带位置元信息（vite build 会将 helper 导入重命名为 highlight）
    expect(bundleCode).toMatch(
      /console\.log\(\.\.\.highlight\("log", \{\s*"file":\s*"main\.js",\s*"line":\s*2,\s*"fn":\s*null\s*\}, "hello", payload\)\)/,
    )
    expect(bundleCode).toMatch(
      /console\.error\(\.\.\.highlight\("error", \{\s*"file":\s*"main\.js",\s*"line":\s*3,\s*"fn":\s*null\s*\}, "boom", new Error\("x"\)\)\)/,
    )
    // 非 console 代码不受影响
    expect(bundleCode).toContain('MARKER-UNCHANGED')
    // 旧版能力已移除：无渐变/阴影样式、无文件名行号前缀
    expect(bundleCode).not.toContain('linear-gradient')
    expect(bundleCode).not.toContain('text-shadow')
    expect(bundleCode).not.toContain('main.js:')
  }, 60_000)
})
