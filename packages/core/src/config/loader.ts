import type { ConsoleHighlightOptions } from '../types'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

export const CONFIG_FILE_NAMES = [
  'console-highlight.config.ts',
  'console-highlight.config.mts',
  'console-highlight.config.mjs',
  'console-highlight.config.js',
  'console-highlight.config.cjs',
  'console-highlight.config.json',
] as const

/** package.json 中读取配置的字段名 */
export const PACKAGE_CONFIG_FIELD = 'consoleHighlight'

export interface LoadedConfig {
  config: ConsoleHighlightOptions
  /** 实际命中的配置文件（用于 watch），未命中时为 null */
  configFile: string | null
}

const require_ = createRequire(import.meta.url)

interface JitiLike {
  evalModule: (source: string, options?: { filename?: string }) => unknown
}

let jitiInstance: JitiLike | null | undefined

function getJiti(): JitiLike | null {
  if (jitiInstance !== undefined) {
    return jitiInstance
  }
  try {
    const { createJiti } = require_('jiti') as typeof import('jiti')
    jitiInstance = createJiti(import.meta.url, { interopDefault: true }) as unknown as JitiLike
  }
  catch {
    jitiInstance = null
  }
  return jitiInstance
}

function unwrapModule(mod: unknown): ConsoleHighlightOptions {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: ConsoleHighlightOptions }).default
  }
  return mod as ConsoleHighlightOptions
}

function loadPackageConfig(root: string): ConsoleHighlightOptions {
  const pkgPath = path.resolve(root, 'package.json')
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
    return (pkg[PACKAGE_CONFIG_FIELD] as ConsoleHighlightOptions) ?? {}
  }
  catch {
    return {}
  }
}

/**
 * 同步加载配置文件。
 * JSON 直接解析；TS/ESM/CJS 优先通过 jiti 加载（支持全部格式），
 * 无 jiti 时回退到原生 require（仅 .cjs/.js）。
 */
function loadConfigFile(filePath: string): ConsoleHighlightOptions {
  if (filePath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ConsoleHighlightOptions
  }

  const jiti = getJiti()
  if (jiti) {
    return unwrapModule(jiti.evalModule(fs.readFileSync(filePath, 'utf-8'), { filename: filePath }))
  }

  if (filePath.endsWith('.cjs') || filePath.endsWith('.js')) {
    delete require_.cache[filePath]
    return unwrapModule(require_(filePath))
  }

  throw new Error(
    `[unplugin-console-highlight] 加载 ${path.basename(filePath)} 需要安装 jiti（可选依赖）: npm i -D jiti`,
  )
}

/**
 * 加载项目配置：独立配置文件优先，其次 package.json 字段。
 */
export function loadConfig(root: string): LoadedConfig {
  for (const filename of CONFIG_FILE_NAMES) {
    const filePath = path.resolve(root, filename)
    if (fs.existsSync(filePath)) {
      try {
        return { config: loadConfigFile(filePath), configFile: filePath }
      }
      catch (error) {
        console.warn(
          `[unplugin-console-highlight] 配置文件加载失败: ${filename}`,
          error instanceof Error ? error.message : error,
        )
      }
    }
  }
  return { config: loadPackageConfig(root), configFile: null }
}
