import type { UnpluginOptions } from 'unplugin'
import type {
  ConsoleHighlightOptions,
  ResolvedConsoleHighlightOptions,
} from './types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import colors from 'picocolors'
import { createUnplugin } from 'unplugin'
import { DEFAULT_CONFIG } from './config/default-config'
import { CONFIG_FILE_NAMES, loadConfig } from './config/loader'
import { transformCode, VIRTUAL_MODULE_ID } from './transformer'
import { deepEqual, mergeConfig, shouldTransform, toRuntimeOptions } from './utils'

export const PLUGIN_NAME = 'unplugin-console-highlight'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

let runtimeCodeCache: string | null = null

function getRuntimeCode(): string {
  if (runtimeCodeCache !== null) {
    return runtimeCodeCache
  }
  const candidates: string[] = []
  try {
    candidates.push(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'runtime.iife.js'))
  }
  catch {
    // CJS 环境下 import.meta.url 可能不可用
  }
  candidates.push(path.resolve(process.cwd(), 'dist/runtime.iife.js'))
  candidates.push(path.resolve(process.cwd(), 'packages/core/dist/runtime.iife.js'))

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      runtimeCodeCache = fs.readFileSync(candidate, 'utf-8')
      return runtimeCodeCache
    }
  }
  throw new Error(
    `[${PLUGIN_NAME}] 找不到注入运行时 dist/runtime.iife.js，请先执行构建（pnpm build）`,
  )
}

const unplugin = createUnplugin((userOptions: ConsoleHighlightOptions = {}, meta) => {
  let resolved: ResolvedConsoleHighlightOptions = mergeConfig(DEFAULT_CONFIG, userOptions)
  let root = userOptions.root ?? process.cwd()
  let configFile: string | null = null

  const resolveOptions = (nextRoot: string): void => {
    root = nextRoot
    const loaded = loadConfig(root)
    configFile = loaded.configFile
    resolved = mergeConfig(DEFAULT_CONFIG, loaded.config, userOptions)
  }

  const virtualModuleCode = (): string => {
    const runtimeOptions = toRuntimeOptions(resolved)
    return [
      getRuntimeCode(),
      `export const highlight = __CONSOLE_HIGHLIGHT_RUNTIME__.createHighlight(${JSON.stringify(runtimeOptions)});`,
      '',
    ].join('\n')
  }

  const plugin: UnpluginOptions = {
    name: PLUGIN_NAME,

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      return null
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return virtualModuleCode()
      }
      return null
    },

    transformInclude(id) {
      return shouldTransform(id, resolved)
    },

    transform(code, id) {
      return transformCode(code, resolved, { id, root }) ?? undefined
    },

    vite: {
      config(config) {
        resolveOptions(path.resolve(config.root || process.cwd()))
        return {
          define: {
            __CONSOLE_HIGHLIGHT__: JSON.stringify(true),
          },
        }
      },

      configureServer(server) {
        const watched = [
          path.join(root, 'package.json'),
          ...CONFIG_FILE_NAMES.map(name => path.join(root, name)),
        ]
        server.watcher.add(watched)
        server.watcher.on('change', (file) => {
          const normalized = path.normalize(file)
          if (!watched.some(candidate => path.normalize(candidate) === normalized)) {
            return
          }
          try {
            const loaded = loadConfig(root)
            if (configFile === loaded.configFile && deepEqual(resolved, mergeConfig(DEFAULT_CONFIG, loaded.config, userOptions))) {
              server.config.logger.info(
                `${colors.cyan(`[${PLUGIN_NAME}]`)} 配置文件修改未产生实际变化`,
              )
              return
            }
            resolveOptions(root)
            server.ws.send({
              type: 'custom',
              event: `${PLUGIN_NAME}:config-update`,
              data: { timestamp: Date.now() },
            })
            void server.restart(true)
          }
          catch (error) {
            server.config.logger.error(
              `${colors.red(`[${PLUGIN_NAME}] 配置重载失败:`)}\n${error instanceof Error ? error.stack : String(error)}`,
              { timestamp: true },
            )
          }
        })
      },
    },

    rollup: {
      buildStart() {
        resolveOptions(root)
      },
    },

    webpack(compiler) {
      compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, async () => {
        resolveOptions(root)
      })
    },
  }

  // 非 Vite 框架没有 config 钩子，首次加载时同步解析一次
  if (meta.framework !== 'vite') {
    resolveOptions(root)
  }

  return plugin
})

export default unplugin

/** Vite 插件（`import { vitePlugin } from 'unplugin-console-highlight'`） */
export const vitePlugin = unplugin.vite
/** Rollup 插件 */
export const rollupPlugin = unplugin.rollup
/** webpack 插件 */
export const webpackPlugin = unplugin.webpack
/** Rspack 插件 */
export const rspackPlugin = unplugin.rspack
/** esbuild 插件 */
export const esbuildPlugin = unplugin.esbuild
/** Farm 插件 */
export const farmPlugin = unplugin.farm

export {
  DARK_PALETTE,
  DEFAULT_CONFIG,
  DEFAULT_ICONS,
  DEFAULT_LABEL,
  DEFAULT_PREFIX,
  LIGHT_PALETTE,
  resolveTokens,
  TOKEN_PRESETS,
} from './config/default-config'
export { CONFIG_FILE_NAMES, loadConfig, PACKAGE_CONFIG_FIELD } from './config/loader'
export {
  contrastText,
  createHighlight,
  detectEnv,
  detectMode,
  formatTime,
  hashString,
  hexToAnsi,
  hexToAnsiBackground,
  serializeToSegments,
} from './runtime'
export { transformCode, VIRTUAL_MODULE_ID } from './transformer'
export { defineConsoleHighlightConfig, defineLabel } from './types'
export type * from './types'
export { deepEqual, getLineNumber, mergeConfig, shouldTransform, toRuntimeOptions } from './utils'
